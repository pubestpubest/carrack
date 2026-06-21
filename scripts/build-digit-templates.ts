import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { extractGlyphs, encodeTemplate } from '../lib/vision/digits'

// Bakes the 0-9 digit templates (extracted from labeled sample crops) into a
// committed JSON the scan route loads. Re-run if the digit font/samples change.
const SAMPLES: Record<string, string> = {
  '1': 'occupied-slot-1.png', '2': 'occupied-slot-2.png', '3': 'occupied-slot-3.png',
  '4': 'occupied-slot-4.png', '5': 'occupied-slot-5.png', '6': 'occupied-slot-6.png',
  '7': 'occupied-slot-7.png', '8': 'occupied-slot-8.png', '9': 'occupied-slot-9.png',
  '20': 'occupied-slot-20.png',
}

async function main() {
  const out: Record<string, string> = {}
  for (const [label, file] of Object.entries(SAMPLES)) {
    const glyphs = await extractGlyphs(await readFile(`docs/${file}`))
    if (glyphs.length !== label.length) {
      console.warn(`! ${file}: ${glyphs.length} glyphs for "${label}"`)
    }
    label.split('').forEach((d, i) => { if (glyphs[i]) out[d] = encodeTemplate(glyphs[i]) })
  }
  const path = join(process.cwd(), 'lib', 'vision', 'digit-templates.json')
  await writeFile(path, JSON.stringify(out, null, 2) + '\n')
  console.log(`wrote ${Object.keys(out).sort().join(' ')} → ${path}`)
}

main().catch(e => { console.error(e); process.exit(1) })
