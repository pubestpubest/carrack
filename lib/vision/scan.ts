import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gridRects, cropCell, innerStats, type GridSpec } from './segment'
import {
  referenceFeatures, captureVariants, extractGrade,
  bestComposite, gradePenalty, type Features,
} from './phash'
import { extractGlyphs, readQuantity, loadTemplates, type Templates } from './digits'
import templatesJson from './digit-templates.json'

export type ItemMeta = { item_id: number; name: string; name_th: string | null; grade: string; image_url: string | null }
export type RefItem  = ItemMeta & { feat: Features }
export type ScanCandidate = {
  item_id: number; name: string; name_th: string | null
  grade: string; image_url: string | null; qty: number; confidence: number
}
export type ScanResult = { candidates: ScanCandidate[]; skipped: number }

const ACCEPT_SCORE  = 0.45 // weakest match still accepted
const STRONG_SCORE  = 0.38 // a confident match is accepted regardless of margin
const ACCEPT_MARGIN = 0.04 // for mediocre scores only, require some lead over runner-up
const ITEM_BRIGHT   = 60 // white-grade items are bright; locked padlock is dark

const templates: Templates = loadTemplates(templatesJson as Record<string, string>)

let refCache: RefItem[] | null = null

// Build reference features from the local catalogue icons. Cached for the process.
export async function loadReferences(items: ItemMeta[]): Promise<RefItem[]> {
  if (refCache) return refCache
  const refs: RefItem[] = []
  for (const it of items) {
    if (!it.image_url) continue
    try {
      const buf = await readFile(join(process.cwd(), 'public', it.image_url))
      refs.push({ ...it, feat: await referenceFeatures(buf) })
    } catch { /* missing file → skip */ }
  }
  refCache = refs
  return refs
}

export async function scanImage(buf: Buffer, refs: RefItem[], grid?: GridSpec): Promise<ScanResult> {
  const { rects } = await gridRects(buf, grid)
  const found: ScanCandidate[] = []
  let skipped = 0

  for (const r of rects) {
    const cell = await cropCell(buf, r)
    const { mean, std } = await innerStats(cell)
    if (std < 8) continue // empty slot

    const grade = await extractGrade(cell)
    // Locked padlock / decoration: no colored ring and dark → not an item attempt.
    if (!grade && mean < ITEM_BRIGHT) continue

    const variants = await captureVariants(cell)
    const ranked = refs
      .map(x => ({ ref: x, s: bestComposite(variants, x.feat) + gradePenalty(grade, x.grade) }))
      .sort((a, b) => a.s - b.s)
    const margin = (ranked[1]?.s ?? Infinity) - ranked[0].s

    // Reject only weak matches, or mediocre ones too close to the runner-up.
    // A confident absolute score (< STRONG_SCORE) is accepted even if a similar
    // item sits close behind — the margin gate was dropping near-perfect matches.
    if (ranked[0].s >= ACCEPT_SCORE || (ranked[0].s >= STRONG_SCORE && margin <= ACCEPT_MARGIN)) { skipped++; continue }

    const qty = readQuantity(await extractGlyphs(cell), templates) ?? 1
    const m = ranked[0].ref
    found.push({
      item_id: m.item_id, name: m.name, name_th: m.name_th, grade: m.grade,
      image_url: m.image_url, qty, confidence: +(1 - ranked[0].s).toFixed(2),
    })
  }

  // Merge the same item appearing in multiple cells by summing quantities.
  const merged = new Map<number, ScanCandidate>()
  for (const c of found) {
    const ex = merged.get(c.item_id)
    if (ex) ex.qty += c.qty
    else merged.set(c.item_id, { ...c })
  }
  return { candidates: [...merged.values()], skipped }
}
