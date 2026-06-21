import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gridRects, cropCell, innerStats } from '../lib/vision/segment'
import {
  referenceFeatures, captureFeatures, captureVariants, extractGrade,
  bestComposite, gradePenalty, hamming, type Features,
} from '../lib/vision/phash'
import grades from './grades.json'

const ITEMS_DIR = join(process.cwd(), 'public', 'images', 'items')
const GRADE: Record<string, string> = grades

async function main() {
  const files = (await readdir(ITEMS_DIR)).filter(f => f.endsWith('.png'))
  const refs: { file: string; grade: string; feat: Features }[] = []
  for (const f of files) {
    const buf = await readFile(join(ITEMS_DIR, f))
    refs.push({ file: f, grade: GRADE[f] ?? '?', feat: await referenceFeatures(buf) })
  }

  const raw = await readFile('docs/raw-session-input.png')
  const { rects } = await gridRects(raw)

  let accepted = 0
  for (const r of rects) {
    const cell  = await cropCell(raw, r)
    const stats = await innerStats(cell)
    if (stats.std < 8) continue // empty — skip early

    const grade = await extractGrade(cell)
    const variants = await captureVariants(cell)
    const ranked = refs
      .map(x => ({ file: x.file, s: bestComposite(variants, x.feat) + gradePenalty(grade, x.grade) }))
      .sort((a, b) => a.s - b.s)
    const margin = ranked[1].s - ranked[0].s
    const ok = ranked[0].s < 0.35 && margin > 0.10
    if (ok) accepted++
    else continue // locked / not-in-system fall out here

    console.log(`[${r.row},${r.col}] grade=${String(grade).padEnd(6)} → ${ranked[0].file}  score=${ranked[0].s.toFixed(3)} margin=${margin.toFixed(3)}`)
  }
  console.log(`\n${accepted} items accepted`)
}

main().catch(e => { console.error(e); process.exit(1) })
