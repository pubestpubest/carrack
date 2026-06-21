import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  referenceFeatures, captureVariants, extractGrade,
  bestComposite, gradePenalty, type Features,
} from '../lib/vision/phash'
import { extractGlyphs, readQuantity, type Templates } from '../lib/vision/digits'
import grades from './grades.json'

const ITEMS_DIR = join(process.cwd(), 'public', 'images', 'items')
const GRADE: Record<string, string> = grades

// label -> sample file
const SAMPLES: Record<string, string> = {
  '1': 'occupied-slot-1.png',  '2': 'occupied-slot-2.png',
  '3': 'occupied-slot-3.png',  '4': 'occupied-slot-4.png',
  '5': 'occupied-slot-5.png',  '6': 'occupied-slot-6.png',
  '7': 'occupied-slot-7.png',  '8': 'occupied-slot-8.png',
  '9': 'occupied-slot-9.png',  '20': 'occupied-slot-20.png',
}

// What we expect identity to do (per the user)
const EXPECT: Record<string, string> = {
  '1':  'skip (gold, not in system)',
  '2':  'brilliant-cobalt-ingot.png',
  '3':  'linen.png (white grade, in system)',
  '4':  'deep-sea-plant-stalk.png',
  '5':  'skip (not in system)',
  '6':  'skip (not in system)',
  '7':  'skip (not in system)',
  '8':  'skip (not in system)',
  '9':  'strong-ocean-iron.png',
  '20': 'enhanced-island-tree-plywood.png',
}

async function buildTemplates(): Promise<Templates> {
  const t: Templates = {}
  for (const [label, file] of Object.entries(SAMPLES)) {
    const glyphs = await extractGlyphs(await readFile(`docs/${file}`))
    label.split('').forEach((d, i) => { if (glyphs[i]) t[d] = glyphs[i] })
  }
  return t
}

async function main() {
  const files = (await readdir(ITEMS_DIR)).filter(f => f.endsWith('.png'))
  const refs: { file: string; grade: string; feat: Features }[] = []
  for (const f of files) {
    const buf = await readFile(join(ITEMS_DIR, f))
    refs.push({ file: f, grade: GRADE[f] ?? '?', feat: await referenceFeatures(buf) })
  }
  const templates = await buildTemplates()
  console.log(`digit templates: ${Object.keys(templates).sort().join(' ')}\n`)

  for (const [label, file] of Object.entries(SAMPLES)) {
    const buf      = await readFile(`docs/${file}`)
    const grade    = await extractGrade(buf)
    const variants = await captureVariants(buf)
    const ranked = refs
      .map(x => ({ file: x.file, s: bestComposite(variants, x.feat) + gradePenalty(grade, x.grade) }))
      .sort((a, b) => a.s - b.s)
    const margin = ranked[1].s - ranked[0].s
    const ok  = ranked[0].s < 0.35 && margin > 0.10
    const qty = readQuantity(await extractGlyphs(buf), templates)

    console.log(`slot "${label}"  grade=${String(grade).padEnd(6)} qty=${String(qty ?? '(1)').padStart(3)}  → ${ok ? ranked[0].file : 'SKIP'}  (score=${ranked[0].s.toFixed(3)} margin=${margin.toFixed(3)})`)
    console.log(`        expect: ${EXPECT[label]}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
