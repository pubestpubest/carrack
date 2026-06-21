import { readFile } from 'node:fs/promises'
import { gridRects, cropCell, innerStats } from '../lib/vision/segment'
import { extractGlyphs, readQuantity, type Templates } from '../lib/vision/digits'

// Build digit templates from labeled sample crops (filename digits = the glyphs)
async function buildTemplates(): Promise<Templates> {
  const t: Templates = {}
  const label = async (file: string, digits: string) => {
    const glyphs = await extractGlyphs(await readFile(`docs/${file}`))
    if (glyphs.length !== digits.length) {
      console.warn(`! ${file}: got ${glyphs.length} glyphs, expected "${digits}"`)
    }
    digits.split('').forEach((d, i) => { if (glyphs[i]) t[d] = glyphs[i] })
  }
  await label('occupied-slot-1.png', '1')
  await label('occupied-slot-2.png', '2')
  await label('occupied-slot-4.png', '4')
  await label('occupied-slot-9.png', '9')
  await label('occupied-slot-20.png', '20')
  return t
}

async function main() {
  const templates = await buildTemplates()
  console.log(`templates: ${Object.keys(templates).sort().join(' ')}\n`)

  const raw = await readFile('docs/raw-session-input.png')
  const { rects } = await gridRects(raw)
  for (const r of rects) {
    const cell = await cropCell(raw, r)
    const { std } = await innerStats(cell)
    if (std < 8) continue
    const glyphs = await extractGlyphs(cell)
    const qty = readQuantity(glyphs, templates)
    console.log(`[${r.row},${r.col}] glyphs=${glyphs.length} qty=${qty ?? '(1)'}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
