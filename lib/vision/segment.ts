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

export async function gridRects(input: Buffer, spec?: GridSpec) {
  const meta = await sharp(input).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  const { cols, rows, marginX = 0, marginY = 0, gapX = 0, gapY = 0 } = spec ?? autoGrid(W, H)
  const cw = (W - 2 * marginX - (cols - 1) * gapX) / cols
  const ch = (H - 2 * marginY - (rows - 1) * gapY) / rows
  const rects: CellRect[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        row: r, col: c,
        left:   Math.round(marginX + c * (cw + gapX)),
        top:    Math.round(marginY + r * (ch + gapY)),
        width:  Math.round(cw),
        height: Math.round(ch),
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
