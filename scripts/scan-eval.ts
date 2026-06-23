// Scanner evaluation harness.
//
//   export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/scan-eval.ts [image]
//
// Runs the vision scanner against the LIVE catalogue (anon REST) and prints a
// per-cell report. If scripts/scan-truth.json matches the image, it also scores
// precision / recall / quantity accuracy against that ground truth.
//
// Workflow to tune accuracy WITHOUT flying blind:
//   1. Run once, eyeball the per-cell report next to the screenshot.
//   2. Correct scripts/scan-truth.json (it is seeded from a scan — fix names,
//      quantities, delete phantoms, add missed items).
//   3. Change thresholds in lib/vision/scan.ts (or the matcher), re-run, compare.

import { readFile } from 'node:fs/promises'
import { loadReferences, scanCells, scanImage, type ItemMeta } from '../lib/vision/scan'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const IMAGE = process.argv[2] ?? 'docs/raw-inventory-sync.png'

async function catalogue(): Promise<ItemMeta[]> {
  const r = await fetch(`${URL}/rest/v1/items?select=item_id,name,name_th,grade,image_url`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!r.ok) throw new Error(`catalogue fetch failed: ${r.status}`)
  return r.json()
}

function pct(n: number, d: number) { return d ? `${((n / d) * 100).toFixed(0)}%` : 'n/a' }
const norm = (s: string) => s.trim().toLowerCase()

async function main() {
  if (!URL || !KEY) throw new Error('set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY (export from .env.local)')
  const refs = await loadReferences(await catalogue())
  const buf = await readFile(IMAGE)

  // Per-cell report
  const cells = await scanCells(buf, refs)
  const cols = Math.max(...cells.map(c => c.col)) + 1
  console.log(`\n${IMAGE} — ${cells.length} cells (${cols} cols)`)
  let nItem = 0, nAcc = 0, nEmpty = 0, nLock = 0
  for (const c of cells) {
    if (c.state === 'empty') nEmpty++
    else if (c.state === 'locked') nLock++
    else {
      nItem++; if (c.accepted) nAcc++
      const tag = c.accepted ? 'OK ' : '-- '
      console.log(`  r${c.col != null ? `${c.row}c${c.col}` : ''} ${tag} ${(c.match?.name ?? '?').padEnd(34)} s=${c.score.toFixed(3)} m=${c.margin.toFixed(3)} qty=${c.qty ?? ''}`)
    }
  }
  console.log(`occupancy: item=${nItem} (accepted ${nAcc}), empty=${nEmpty}, locked=${nLock}`)

  // Merged result
  const { candidates, skipped } = await scanImage(buf, refs)
  console.log(`detected ${candidates.length} unique items, skipped ${skipped} cells`)

  // Score vs ground truth if present and for this image
  let truth: { image?: string; items?: { name: string; qty: number }[] } | null = null
  try { truth = JSON.parse(await readFile('scripts/scan-truth.json', 'utf8')) } catch { /* none */ }
  if (!truth?.items || (truth.image && truth.image !== IMAGE)) {
    console.log('\n(no ground truth for this image — fill scripts/scan-truth.json to score)')
    return
  }

  const truthMap = new Map(truth.items.map(t => [norm(t.name), t.qty]))
  const detMap = new Map(candidates.map(c => [norm(c.name), c.qty]))
  let hit = 0, qtyOk = 0
  const missing: string[] = [], extra: string[] = [], qtyBad: string[] = []
  for (const [name, q] of truthMap) {
    if (detMap.has(name)) { hit++; if (detMap.get(name) === q) qtyOk++; else qtyBad.push(`${name} truth=${q} got=${detMap.get(name)}`) }
    else missing.push(name)
  }
  for (const [name] of detMap) if (!truthMap.has(name)) extra.push(name)

  console.log(`\n=== SCORE vs ground truth (${truthMap.size} items) ===`)
  console.log(`recall    ${pct(hit, truthMap.size)}  (${hit}/${truthMap.size} found)`)
  console.log(`precision ${pct(hit, detMap.size)}  (${hit}/${detMap.size} detected are real)`)
  console.log(`qty acc   ${pct(qtyOk, hit)}  (${qtyOk}/${hit} matched items have correct qty)`)
  if (missing.length) console.log(`\nMISSED (${missing.length}): ${missing.join(', ')}`)
  if (extra.length)   console.log(`\nFALSE POSITIVES (${extra.length}): ${extra.join(', ')}`)
  if (qtyBad.length)  console.log(`\nWRONG QTY (${qtyBad.length}):\n  ${qtyBad.join('\n  ')}`)
}

main().catch(e => { console.error(e); process.exit(1) })
