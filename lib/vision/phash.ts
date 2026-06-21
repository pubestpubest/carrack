import sharp, { type Sharp } from 'sharp'

// Feature pipeline shared by the reference-fingerprint build and the capture-time
// scan, so both sides normalize identically. Each side yields:
//   - pHash (shape / structure, grayscale DCT)
//   - color thumbnail (8x8 RGB) — the dominant signal for vivid item icons
// Identity uses a COMPOSITE of the two; grayscale alone is insufficient.

export const HASH_SIZE = 32
const LOW = 8 // low-frequency DCT block kept → 8x8 = 64 bits
const COLOR = 8 // color thumbnail edge → 8x8x3 = 192 dims

export type Features = { hash: bigint; color: Float64Array }

// Precomputed DCT-II cosine basis: cos[u][x]
const COS: number[][] = (() => {
  const m: number[][] = []
  for (let u = 0; u < LOW; u++) {
    m[u] = []
    for (let x = 0; x < HASH_SIZE; x++) {
      m[u][x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * HASH_SIZE))
    }
  }
  return m
})()

// Zero the bottom-right corner where the in-game quantity digit is burned in.
function maskCorner(gray: Uint8Array) {
  const cx = Math.floor(HASH_SIZE * 0.55)
  const cy = Math.floor(HASH_SIZE * 0.62)
  for (let y = cy; y < HASH_SIZE; y++)
    for (let x = cx; x < HASH_SIZE; x++)
      gray[y * HASH_SIZE + x] = 0
}

function pHash(gray: Uint8Array): bigint {
  const n = HASH_SIZE
  const tmp = new Float64Array(LOW * n)
  for (let u = 0; u < LOW; u++) {
    const cu = COS[u]
    for (let y = 0; y < n; y++) {
      let s = 0
      const row = y * n
      for (let x = 0; x < n; x++) s += gray[row + x] * cu[x]
      tmp[u * n + y] = s
    }
  }
  const coef = new Float64Array(LOW * LOW)
  for (let u = 0; u < LOW; u++) {
    for (let v = 0; v < LOW; v++) {
      const cv = COS[v]
      let s = 0
      for (let y = 0; y < n; y++) s += tmp[u * n + y] * cv[y]
      coef[u * LOW + v] = s
    }
  }
  const sorted = Array.from(coef).slice(1).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  let hash = 0n
  for (let i = 0; i < LOW * LOW; i++) {
    if (coef[i] > median) hash |= 1n << BigInt(i)
  }
  return hash
}

// Branch a prepared pipeline into both feature channels.
async function featuresFrom(base: Sharp): Promise<Features> {
  const grayBuf = await base.clone()
    .resize(HASH_SIZE, HASH_SIZE, { fit: 'fill' })
    .greyscale().raw().toBuffer()
  const gray = new Uint8Array(HASH_SIZE * HASH_SIZE)
  for (let i = 0; i < gray.length; i++) gray[i] = grayBuf[i]
  maskCorner(gray)

  const colBuf = await base.clone()
    .resize(COLOR, COLOR, { fit: 'fill' })
    .removeAlpha().raw().toBuffer() // 8*8*3
  const color = new Float64Array(COLOR * COLOR * 3)
  for (let i = 0; i < color.length; i++) color[i] = colBuf[i] / 255

  return { hash: pHash(gray), color }
}

// Official PNG (transparent bg): trim padding, composite onto black.
export function referenceFeatures(input: Buffer): Promise<Features> {
  return featuresFrom(sharp(input).trim().flatten({ background: '#000000' }))
}

// In-game cell crop: inset to drop the colored grade-frame, composite onto black.
export async function captureFeatures(input: Buffer, inset = 0.12): Promise<Features> {
  const meta = await sharp(input).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const dx = Math.round(w * inset)
  const dy = Math.round(h * inset)
  return featuresFrom(
    sharp(input)
      .extract({ left: dx, top: dy, width: Math.max(1, w - 2 * dx), height: Math.max(1, h - 2 * dy) })
      .flatten({ background: '#000000' }),
  )
}

// Classify a hue (degrees) into a BDO grade bucket.
function hueToGrade(hue: number): string | null {
  if (hue < 15 || hue >= 345) return 'red'
  if (hue < 40)  return 'orange'
  if (hue < 70)  return 'yellow'
  if (hue < 175) return 'green'
  if (hue < 265) return 'blue'
  return null
}

// Sample the colored frame ring of a cell crop and classify its grade.
// Returns null when the ring isn't saturated (empty/locked/white).
export async function extractGrade(input: Buffer): Promise<string | null> {
  const S = 64
  const { data } = await sharp(input)
    .resize(S, S, { fit: 'fill' }).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const lo = Math.floor(S * 0.03)
  const hi = Math.ceil(S * 0.15)

  let vx = 0, vy = 0, n = 0
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dEdge = Math.min(x, y, S - 1 - x, S - 1 - y)
      if (dEdge < lo || dEdge >= hi) continue
      const i = (y * S + x) * 3
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const v = max, s = max === 0 ? 0 : (max - min) / max
      if (s < 0.35 || v < 0.25) continue
      let h = 0
      const d = max - min
      if (d > 0) {
        if (max === r)      h = ((g - b) / d) % 6
        else if (max === g) h = (b - r) / d + 2
        else                h = (r - g) / d + 4
        h *= 60
        if (h < 0) h += 360
      }
      vx += Math.cos((h * Math.PI) / 180)
      vy += Math.sin((h * Math.PI) / 180)
      n++
    }
  }
  if (n < S * 0.5) return null // too few saturated ring pixels
  let mean = (Math.atan2(vy, vx) * 180) / Math.PI
  if (mean < 0) mean += 360
  return hueToGrade(mean)
}

// pHash is not translation-invariant, and uniform grid crops drift a few px from
// the true icon position. Generate features at a small grid of crop offsets so the
// matcher can take the best-aligned variant.
export async function captureVariants(input: Buffer, inset = 0.12, shifts = [-0.05, 0, 0.05]): Promise<Features[]> {
  const meta = await sharp(input).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const baseDX = Math.round(w * inset)
  const baseDY = Math.round(h * inset)
  const iw = Math.max(1, w - 2 * baseDX)
  const ih = Math.max(1, h - 2 * baseDY)
  const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max))
  const out: Features[] = []
  for (const sy of shifts) {
    for (const sx of shifts) {
      const left = clamp(baseDX + Math.round(w * sx), w - iw)
      const top  = clamp(baseDY + Math.round(h * sy), h - ih)
      out.push(await featuresFrom(
        sharp(input).extract({ left, top, width: iw, height: ih }).flatten({ background: '#000000' }),
      ))
    }
  }
  return out
}

// Best composite of a ref against any capture variant.
export function bestComposite(variants: Features[], ref: Features, wColor = 4): number {
  let best = Infinity
  for (const v of variants) {
    const c = composite(v, ref, wColor)
    if (c < best) best = c
  }
  return best
}

// Grade penalty scaled by hue distance — adjacent grades (e.g. orange↔yellow, which
// the ring detector can confuse at the boundary) cost little; far grades cost the cap.
const GRADE_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2, green: 3, blue: 4 }
export function gradePenalty(capture: string | null, ref: string, perStep = 0.12, cap = 0.5): number {
  if (!capture || capture === ref) return 0
  const a = GRADE_ORDER[capture]
  const b = GRADE_ORDER[ref]
  if (a === undefined || b === undefined) return cap // white vs colored, or unknown
  return Math.min(cap, Math.abs(a - b) * perStep)
}

export function hamming(a: bigint, b: bigint): number {
  let x = a ^ b
  let c = 0
  while (x) { x &= x - 1n; c++ }
  return c
}

// Mean squared difference of the color thumbnails, ~[0,1].
export function colorDist(a: Float64Array, b: Float64Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d }
  return s / a.length
}

// Composite distance: shape (normalized Hamming) + weighted color.
export function composite(a: Features, b: Features, wColor = 4): number {
  return hamming(a.hash, b.hash) / 64 + wColor * colorDist(a.color, b.color)
}

export const toHex = (h: bigint) => h.toString(16).padStart(16, '0')
export const fromHex = (s: string) => BigInt('0x' + s)
