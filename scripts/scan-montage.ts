// Labeling aid: crop every grid cell (using the detected grid) into one montage
// PNG so you can read items/quantities and fill scripts/scan-truth.json.
//
//   npx tsx scripts/scan-montage.ts [image] [outPng]

import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { gridRects } from '../lib/vision/segment'

const IMAGE = process.argv[2] ?? 'docs/raw-inventory-sync.png'
const OUT   = process.argv[3] ?? 'scan-montage.png'
const S = 88, PAD = 4

async function main() {
  const buf = await readFile(IMAGE)
  const { rects } = await gridRects(buf)
  const cols = Math.max(...rects.map(r => r.col)) + 1
  const rows = Math.max(...rects.map(r => r.row)) + 1
  const tiles = await Promise.all(rects.map(async r => ({
    r, png: await sharp(buf).extract({ left: r.left, top: r.top, width: r.width, height: r.height }).resize(S, S, { fit: 'fill' }).png().toBuffer(),
  })))
  const CW = S + PAD, CH = S + PAD
  await sharp({ create: { width: cols * CW, height: rows * CH, channels: 3, background: '#111' } })
    .composite(tiles.map(t => ({ input: t.png, left: t.r.col * CW, top: t.r.row * CH })))
    .png().toFile(OUT)
  console.log(`wrote ${OUT} (${cols}×${rows})`)
}

main().catch(e => { console.error(e); process.exit(1) })
