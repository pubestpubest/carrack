#!/usr/bin/env node
/**
 * Run extract-items.mjs on every HTML file in scripts/inputs/,
 * merge results (first occurrence of each name wins), write items.json.
 *
 * Usage: node scripts/build-items-json.mjs
 */

import { spawnSync }  from 'child_process'
import { readdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT    = resolve(fileURLToPath(import.meta.url), '../..')
const INPUTS  = join(ROOT, 'scripts/inputs')
const EXTRACT = join(ROOT, 'scripts/extract-items.mjs')
const OUT     = join(ROOT, 'items.json')

const files = readdirSync(INPUTS).filter(f => f.endsWith('.html')).sort()

// Known wiki typos: extracted name → correct name
const CORRECTIONS = new Map([
  ['เรือคาร์แร็คเอเฟเรีย : ใบเรือขงอชีโล่', 'เรือคาร์แร็คเอเฟเรีย : ใบเรือของชีโล่'],
  ['วัตถุโบราณของกลุ่มโจรสลัดค็อกซ์ (การเจรจาระดับต่ำ)', 'วัตถุโบราณของโจรสลัดค็อกซ์ (การเจรจาระดับต่ำ)'],
])

const seen   = new Map()   // name → item
let   total  = 0
let   errors = 0

for (const file of files) {
  const result = spawnSync('node', [EXTRACT, join(INPUTS, file)], { encoding: 'utf8' })

  if (result.status !== 0 || !result.stdout.trim()) {
    console.log(`  ${file}  → (skipped: ${result.stderr?.trim() || 'no output'})`)
    errors++
    continue
  }

  let items
  try { items = JSON.parse(result.stdout) } catch {
    console.log(`  ${file}  → (parse error)`)
    errors++
    continue
  }

  let added = 0
  for (const item of items) {
    if (CORRECTIONS.has(item.name)) item.name = CORRECTIONS.get(item.name)
    if (!seen.has(item.name)) { seen.set(item.name, item); added++ }
  }

  console.log(`  ${file}  → ${items.length} items  (+${added} new)`)
  total += items.length
}

const merged = [...seen.values()]
writeFileSync(OUT, JSON.stringify(merged, null, 2))

console.log(`\nProcessed ${files.length} files  (${errors} skipped)`)
console.log(`Total extracted: ${total}  →  Unique: ${merged.length}`)
console.log(`Written: items.json`)
