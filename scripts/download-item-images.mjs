#!/usr/bin/env node
/**
 * Download item images from items.json and map them to DB items.
 *
 * Steps:
 *  1. Parse seed SQL → build name_th → { item_id, name } map
 *  2. Match each items.json entry by exact name_th
 *  3. Download unique images to public/images/items/{slug}.png
 *  4. Write SQL migration to update items.image_url
 *
 * Usage: node scripts/download-item-images.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createWriteStream } from 'fs'
import https from 'https'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')

// ── helpers ───────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) { resolve('cached'); return }
    const file = createWriteStream(dest)
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve('downloaded')))
    })
    req.on('error', err => { file.close(); reject(err) })
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ── 1. Parse seed SQL → item map ──────────────────────────────────────────

const seedSql = readFileSync(path.join(ROOT, 'supabase/migrations/20260619_seed_data.sql'), 'utf8')

// Match: (item_id, 'English Name', 'Thai Name', ...
const ITEM_ROW = /\(\s*(\d+)\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g
const dbItems  = new Map()   // name_th → { itemId, name }

for (const m of seedSql.matchAll(ITEM_ROW)) {
  const itemId  = parseInt(m[1], 10)
  const name    = m[2]
  const nameTh  = m[3]
  dbItems.set(nameTh, { itemId, name })
}

console.log(`Parsed ${dbItems.size} items from seed SQL.`)

// ── 2. Match items.json entries ───────────────────────────────────────────

const jsonItems = JSON.parse(readFileSync(path.join(ROOT, 'items.json'), 'utf8'))

// First match per item_id wins (duplicate entries exist for same Thai name)
const itemImageMap = new Map()  // item_id → { name, imageUrl }

for (const entry of jsonItems) {
  const match = dbItems.get(entry.name)
  if (!match) continue
  if (itemImageMap.has(match.itemId)) continue   // first match wins
  itemImageMap.set(match.itemId, { name: match.name, imageUrl: entry.imageUrl })
}

console.log(`Matched ${itemImageMap.size} items to DB entries.`)

// ── 3. Download images ────────────────────────────────────────────────────

const OUT_DIR = path.join(ROOT, 'public/images/items')
mkdirSync(OUT_DIR, { recursive: true })

// Track URL → local filename to deduplicate downloads
const urlToFile = new Map()

const results = []
let downloaded = 0, cached = 0, failed = 0

for (const [itemId, { name, imageUrl }] of itemImageMap) {
  const slug     = slugify(name)
  let   filename = urlToFile.get(imageUrl)

  if (!filename) {
    filename = `${slug}.png`
    urlToFile.set(imageUrl, filename)
  }

  const dest = path.join(OUT_DIR, filename)
  process.stdout.write(`  [${itemId}] ${name} → ${filename} ... `)

  try {
    const status = await download(imageUrl, dest)
    if (status === 'cached') cached++; else downloaded++
    console.log(status)
    results.push({ itemId, localPath: `/images/items/${filename}` })
  } catch (err) {
    failed++
    console.log(`FAILED (${err.message})`)
    results.push({ itemId, localPath: null, error: err.message })
  }
}

console.log(`\nDownload summary: ${downloaded} downloaded, ${cached} cached, ${failed} failed`)

// ── 4. Generate SQL migration ─────────────────────────────────────────────

const successful = results.filter(r => r.localPath)

const sql = [
  '-- Auto-generated: update item image_url to local paths',
  '-- Run: psql $DATABASE_URL -f supabase/migrations/update_item_images.sql',
  '',
  ...successful.map(r => `UPDATE items SET image_url = '${r.localPath}' WHERE item_id = ${r.itemId};`),
  '',
  `-- ${successful.length} items updated, ${failed} failed (no image_url set for those)`,
].join('\n')

const sqlPath = path.join(ROOT, 'supabase/migrations/update_item_images.sql')
writeFileSync(sqlPath, sql)
console.log(`\nSQL migration written to: supabase/migrations/update_item_images.sql`)

// Print unmatched DB items (items with no image found)
const matchedIds = new Set(itemImageMap.keys())
const unmatched  = [...dbItems.values()].filter(v => !matchedIds.has(v.itemId))
if (unmatched.length) {
  console.log(`\nNo image found for ${unmatched.length} DB items:`)
  for (const { itemId, name } of unmatched) {
    console.log(`  [${itemId}] ${name}`)
  }
}
