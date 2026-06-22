import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gridRects, cropCell, innerStats } from '../lib/vision/segment'
import {
  referenceFeatures, captureVariants, extractGrade,
  bestComposite, gradePenalty, type Features,
} from '../lib/vision/phash'
import grades from './grades.json'

const ITEMS_DIR = join(process.cwd(), 'public', 'images', 'items')
const GRADE: Record<string, string> = grades
const IMG = process.argv[2] ?? 'docs/red-test.png'

async function main() {
  const files = (await readdir(ITEMS_DIR)).filter(f => f.endsWith('.png'))
  const refs: { file: string; grade: string; feat: Features }[] = []
  for (const f of files) {
    const buf = await readFile(join(ITEMS_DIR, f))
    refs.push({ file: f, grade: GRADE[f] ?? '?', feat: await referenceFeatures(buf) })
  }

  const raw = await readFile(IMG)
  const { rects } = await gridRects(raw)
  console.log(`${IMG}\n`)

  for (const r of rects) {
    const cell = await cropCell(raw, r)
    const { mean, std } = await innerStats(cell)
    if (std < 8) continue
    const grade = await extractGrade(cell)
    if (!grade && mean < 60) continue // locked

    const variants = await captureVariants(cell)
    const ranked = refs
      .map(x => ({ file: x.file, base: bestComposite(variants, x.feat), s: bestComposite(variants, x.feat) + gradePenalty(grade, x.grade), g: x.grade }))
      .sort((a, b) => a.s - b.s)
      .slice(0, 4)
    const margin = ranked[1].s - ranked[0].s
    const ok = ranked[0].s < 0.35 && margin > 0.10

    console.log(`[${r.row},${r.col}] grade=${String(grade).padEnd(6)} mean=${mean.toFixed(0)} ${ok ? 'ACCEPT' : 'SKIP'} margin=${margin.toFixed(3)}`)
    for (const x of ranked)
      console.log(`        ${x.s.toFixed(3)} (base ${x.base.toFixed(3)}) ${x.g.padEnd(6)} ${x.file}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
