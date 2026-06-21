import sharp from 'sharp'

// Quantity reader: the in-game stack count is white digits in a fixed bottom-right
// corner, in a fixed bitmap font. We binarize, split glyphs, and template-match each
// against digit templates extracted once from labeled samples. No OCR engine.

export const GW = 12
export const GH = 18
export type Templates = Record<string, Uint8Array> // digit char -> GW*GH binary

const UPSCALE = 4
const THRESH = 198 // white-fill threshold; digits are near-white, icon bleed is colored/dimmer

// Binarized number region: bottom-right corner of the cell, upscaled.
async function numberMask(cellBuf: Buffer) {
  const meta = await sharp(cellBuf).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const left = Math.round(w * 0.46)
  const top  = Math.round(h * 0.66)
  const cw = w - left
  const ch = h - top
  const W = cw * UPSCALE
  const H = ch * UPSCALE
  const buf = await sharp(cellBuf)
    .extract({ left, top, width: cw, height: ch })
    .resize(W, H, { kernel: 'nearest' })
    .greyscale().raw().toBuffer()
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < mask.length; i++) mask[i] = buf[i] >= THRESH ? 1 : 0
  return { mask, W, H }
}

// Split the mask into ordered glyph bounding boxes via column projection.
function splitGlyphs(mask: Uint8Array, W: number, H: number) {
  const colHas = new Array(W).fill(false)
  for (let x = 0; x < W; x++) {
    let c = 0
    for (let y = 0; y < H; y++) if (mask[y * W + x]) c++
    colHas[x] = c >= 2 // ignore 1px speckle
  }
  const spans: [number, number][] = []
  let start = -1
  for (let x = 0; x <= W; x++) {
    if (x < W && colHas[x]) { if (start < 0) start = x }
    else if (start >= 0) { if (x - start >= 2) spans.push([start, x]); start = -1 }
  }
  // For each column span, find row extent and normalize to GWxGH.
  const glyphs: Uint8Array[] = []
  for (const [x0, x1] of spans) {
    let y0 = H, y1 = 0
    for (let y = 0; y < H; y++)
      for (let x = x0; x < x1; x++)
        if (mask[y * W + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (y1 < y0) continue
    const gw = x1 - x0
    const gh = y1 - y0 + 1
    if (gh < H * 0.3) continue // too short to be a digit
    const g = new Uint8Array(GW * GH)
    for (let ty = 0; ty < GH; ty++) {
      for (let tx = 0; tx < GW; tx++) {
        const sx = x0 + Math.floor((tx / GW) * gw)
        const sy = y0 + Math.floor((ty / GH) * gh)
        g[ty * GW + tx] = mask[sy * W + sx]
      }
    }
    glyphs.push(g)
  }
  return glyphs
}

export async function extractGlyphs(cellBuf: Buffer): Promise<Uint8Array[]> {
  const { mask, W, H } = await numberMask(cellBuf)
  return splitGlyphs(mask, W, H)
}

// Serialize/deserialize templates so they can be baked into committed JSON
// (the build samples in docs/ don't ship).
export function encodeTemplate(g: Uint8Array): string {
  return Buffer.from(g).toString('base64')
}
export function loadTemplates(json: Record<string, string>): Templates {
  const t: Templates = {}
  for (const [d, b64] of Object.entries(json)) t[d] = new Uint8Array(Buffer.from(b64, 'base64'))
  return t
}

function glyphScore(a: Uint8Array, b: Uint8Array): number {
  let same = 0
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++
  return same / a.length
}

// Read the stack quantity; null when no glyphs (treat as qty 1 upstream).
export function readQuantity(glyphs: Uint8Array[], templates: Templates): number | null {
  if (glyphs.length === 0) return null
  let out = ''
  for (const g of glyphs) {
    let best = '', bestS = 0
    for (const [d, t] of Object.entries(templates)) {
      const s = glyphScore(g, t)
      if (s > bestS) { bestS = s; best = d }
    }
    if (bestS < 0.7) return null // low confidence
    out += best
  }
  const n = parseInt(out, 10)
  return Number.isFinite(n) ? n : null
}
