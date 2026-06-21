import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  referenceFeatures, captureFeatures, extractGrade,
  hamming, colorDist, composite, type Features,
} from '../lib/vision/phash'
import grades from './grades.json'

const ITEMS_DIR   = join(process.cwd(), 'public', 'images', 'items')
const SAMPLES_DIR = join(process.cwd(), 'docs')
const GRADE: Record<string, string> = grades

const SAMPLES = [
  'occupied-slot-1.png',
  'occupied-slot-2.png',
  'occupied-slot-4.png',
  'occupied-slot-9.png',
  'occupied-slot-20.png',
]

// Penalty added to composite when a candidate's grade != the detected ring grade.
const GRADE_PENALTY = 0.5

async function main() {
  const files = (await readdir(ITEMS_DIR)).filter(f => f.endsWith('.png'))
  const refs: { file: string; grade: string; feat: Features }[] = []
  for (const f of files) {
    const buf = await readFile(join(ITEMS_DIR, f))
    refs.push({ file: f, grade: GRADE[f] ?? '?', feat: await referenceFeatures(buf) })
  }
  console.log(`Built ${refs.length} reference fingerprints\n`)

  for (const s of SAMPLES) {
    const buf   = await readFile(join(SAMPLES_DIR, s))
    const feat  = await captureFeatures(buf)
    const grade = await extractGrade(buf)

    const ranked = refs
      .map(r => {
        const base = composite(feat, r.feat)
        const pen  = grade && r.grade !== grade ? GRADE_PENALTY : 0
        return { file: r.file, grade: r.grade, score: base + pen, base, h: hamming(feat.hash, r.feat.hash), col: colorDist(feat.color, r.feat.color) }
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)

    console.log(`${s}   [ring grade: ${grade ?? 'none'}]`)
    for (const r of ranked)
      console.log(`   score=${r.score.toFixed(3)}  base=${r.base.toFixed(3)}  ham=${String(r.h).padStart(2)}  col=${r.col.toFixed(4)}  ${r.grade.padEnd(6)} ${r.file}`)
    console.log(`   → margin=${(ranked[1].score - ranked[0].score).toFixed(3)}\n`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
