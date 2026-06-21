import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadReferences, scanImage, type ItemMeta } from '../lib/vision/scan'
import grades from './grades.json'

const ITEMS_DIR = join(process.cwd(), 'public', 'images', 'items')
const GRADE: Record<string, string> = grades

async function main() {
  // Synthesize ItemMeta from local files (item_id = index) — stands in for the DB.
  const files = (await readdir(ITEMS_DIR)).filter(f => f.endsWith('.png'))
  const items: ItemMeta[] = files.map((f, i) => ({
    item_id: i, name: f.replace('.png', ''), name_th: null,
    grade: GRADE[f] ?? 'white', image_url: '/images/items/' + f,
  }))

  const refs = await loadReferences(items)
  const raw  = await readFile('docs/raw-session-input.png')
  const result = await scanImage(raw, refs)

  console.log(`candidates (${result.candidates.length}), skipped=${result.skipped}\n`)
  for (const c of result.candidates)
    console.log(`  ${c.name}  ×${c.qty}  (conf ${c.confidence})`)
}

main().catch(e => { console.error(e); process.exit(1) })
