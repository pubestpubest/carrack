import sharp from 'sharp'

// Grid segmentation for the in-game inventory. The capture guide keeps geometry
// consistent, so we divide the framed region uniformly and classify each cell.

export type CellRect = { row: number; col: number; left: number; top: number; width: number; height: number }
export type GridSpec = { cols: number; rows: number; marginX?: number; marginY?: number; gapX?: number; gapY?: number }

export const DEFAULT_GRID: GridSpec = { cols: 5, rows: 7 }

// BDO keeps a fixed slot pitch and grows the grid (more rows/cols as bag space
// unlocks), so derive cols/rows from the capture size instead of assuming 5×7.
// ponytail: constant pitch assumes the documented capture scale; if users start
// capturing at varying UI scale/DPI, detect the pitch from inter-slot gaps instead.
const SLOT_PX = 51.5
export function autoGrid(W: number, H: number): GridSpec {
  return { cols: Math.max(1, Math.round(W / SLOT_PX)), rows: Math.max(1, Math.round(H / SLOT_PX)) }
}

// Fit n+1 evenly-spaced border lines to the dark inter-slot gaps in a brightness
// projection. Real captures are inset and drift a few px, so even-dividing the
// whole image lands crops a little off — enough to clip icons and qty digits.
// We jointly fit one (offset, pitch) per axis (robust to noise; no per-line
// overfit) by minimizing total brightness along the predicted border lines.
function fitLines(proj: number[], n: number): number[] {
  const L = proj.length
  const cw = L / n
  let best = { score: Infinity, o: 0, p: cw }
  for (let p = cw * 0.95; p <= cw * 1.05; p += 0.25) {
    for (let o = -8; o <= 8; o += 0.5) {
      let s = 0
      for (let i = 0; i <= n; i++) {
        const x = Math.round(o + i * p)
        s += x >= 0 && x < L ? proj[x] : 255 // penalize lines that fall off the image
      }
      if (s < best.score) best = { score: s, o, p }
    }
  }
  const lines: number[] = []
  for (let i = 0; i <= n; i++) lines.push(Math.max(0, Math.min(L, Math.round(best.o + i * best.p))))
  return lines
}

// Per-column / per-row mean brightness.
async function projections(input: Buffer, W: number, H: number) {
  const g = await sharp(input).greyscale().raw().toBuffer()
  const col = new Array(W).fill(0), row = new Array(H).fill(0)
  for (let y = 0; y < H; y++) {
    const base = y * W
    for (let x = 0; x < W; x++) { const v = g[base + x]; col[x] += v; row[y] += v }
  }
  for (let x = 0; x < W; x++) col[x] /= H
  for (let y = 0; y < H; y++) row[y] /= W
  return { col, row }
}

export async function gridRects(input: Buffer, spec?: GridSpec) {
  const meta = await sharp(input).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  const { cols, rows } = spec ?? autoGrid(W, H)

  // Explicit margins/gaps mean a hand-specified grid: keep the uniform division.
  const explicit = spec && (spec.marginX || spec.marginY || spec.gapX || spec.gapY)
  let xs: number[], ys: number[]
  if (explicit) {
    const cw = (W - 2 * (spec!.marginX ?? 0) - (cols - 1) * (spec!.gapX ?? 0)) / cols
    const ch = (H - 2 * (spec!.marginY ?? 0) - (rows - 1) * (spec!.gapY ?? 0)) / rows
    xs = Array.from({ length: cols + 1 }, (_, c) => Math.round((spec!.marginX ?? 0) + c * (cw + (spec!.gapX ?? 0))))
    ys = Array.from({ length: rows + 1 }, (_, r) => Math.round((spec!.marginY ?? 0) + r * (ch + (spec!.gapY ?? 0))))
  } else {
    const { col, row } = await projections(input, W, H)
    xs = fitLines(col, cols)
    ys = fitLines(row, rows)
  }

  const rects: CellRect[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        row: r, col: c,
        left:   xs[c],
        top:    ys[r],
        width:  Math.max(1, xs[c + 1] - xs[c]),
        height: Math.max(1, ys[r + 1] - ys[r]),
      })
    }
  }
  return { W, H, rects }
}

export function cropCell(input: Buffer, r: CellRect): Promise<Buffer> {
  return sharp(input).extract({ left: r.left, top: r.top, width: r.width, height: r.height }).png().toBuffer()
}

// Mean brightness + std-dev of the central region. Empty slots are flat & dark
// (low std), the locked padlock is dark (low mean) but textured (mid std), items
// are brighter and varied.
export async function innerStats(cellBuf: Buffer): Promise<{ mean: number; std: number }> {
  const S = 32
  const buf = await sharp(cellBuf).resize(S, S, { fit: 'fill' }).greyscale().raw().toBuffer()
  const a = Math.floor(S * 0.2)
  const b = Math.ceil(S * 0.8)
  let sum = 0, sum2 = 0, n = 0
  for (let y = a; y < b; y++) {
    for (let x = a; x < b; x++) {
      const v = buf[y * S + x]
      sum += v; sum2 += v * v; n++
    }
  }
  const mean = sum / n
  return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) }
}

export type SlotState = 'item' | 'empty' | 'locked'

// Occupancy classifier. Primary signal: a saturated grade-border ring → item.
// White-grade items (no colored ring) are caught by brightness+texture; the dark
// locked padlock and flat empty slots fall through to skip.
export function classify(grade: string | null, stats: { mean: number; std: number }): SlotState {
  if (stats.std < 8) return 'empty'
  if (grade) return 'item'
  if (stats.mean < 45) return 'locked' // dark padlock, no colored ring
  return 'item' // bright white-grade item
}
