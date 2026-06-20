#!/usr/bin/env node
/**
 * Extract item names + image URLs from BDO wiki HTML tables.
 *
 * Handles two table formats found on the Thai BDO wiki:
 *
 *   Type A — 3 columns:  [icon] | [item name]  | [acquisition info]
 *   Type B — 2 columns:  [icon] | [acquisition desc]
 *            + a colspan section-header row above it that holds the item name
 *
 * Usage:
 *   node scripts/extract-items.mjs input.html          # JSON
 *   node scripts/extract-items.mjs input.html --csv    # CSV
 *   node scripts/extract-items.mjs input.html --debug  # show section headers
 */

import { readFileSync } from 'fs'
import { createInterface } from 'readline'

// ── helpers ───────────────────────────────────────────────────────────────

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractRows(html) {
  return [...html.matchAll(/<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi)].map(m => m[1])
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1])
}

/** True when the FIRST td in the row has colspan > 1 — i.e. a section header.
 *  Rows where only a later td has colspan (e.g. acquisition description spanning
 *  columns) are NOT section headers and should be processed as data rows. */
function isSectionHeader(rowHtml) {
  const firstTd = rowHtml.match(/<td[^>]*>[\s\S]*?<\/td>/i)
  if (!firstTd) return false
  return /colspan\s*=\s*["']?[2-9]["']?/i.test(firstTd[0])
}

/**
 * Strip trailing workshop/craft location from a section title.
 * "เรือการค้าเอเฟเรีย : หัวเรือมังกรดำ- ผลิตที่โรงผลิตชิ้นส่วนเรือระดับ 4 -"
 * → "เรือการค้าเอเฟเรีย : หัวเรือมังกรดำ"
 */
function cleanSectionTitle(text) {
  return text
    .replace(/\s*[-–]\s*(?:ผลิต|สามารถ|ต้องการ|บันทึก|ขุด|ซื้อ|แลก|ฯลฯ)[\s\S]*/u, '')
    .replace(/\s+(?:ผลิตที่|สามารถผลิต)[\s\S]*/u, '')
    .replace(/\s*:\s*\([^)]+\)\s*$/, '')   // strip trailing ": (type1, type2, …)"
    .trim()
}

/** True when a section title is itself acquisition/meta info, not an item name. */
function isBadSection(text) {
  const bad = [/^ซื้อ/, /^แลกเปลี่ยน/, /^ผลิต/, /^ขุด/, /^ราวีเนีย/, /^ฟิลลาเบลโท/, /^รังอีกาดำ/, /^ใบอนุญาต/, /^แผนผัง/]
  return bad.some(r => r.test(text))
}

/**
 * True when col-2 text is acquisition info rather than an item name.
 * Heuristics: starts with a Thai "verb of obtaining", contains shop/NPC
 * keywords, or is suspiciously long.
 */
function isAcquisitionDesc(text) {
  if (text.length > 80) return true
  const triggers = [
    /^ซื้อ/,           // buy
    /^แลกเปลี่ยน/,     // exchange
    /^ผลิต/,           // craft/produce
    /^ขุด/,            // mine
    /ร้านค้าอีกาดำ/,   // Crow Exchange shop
    /พัลลาซี/,         // Falasi NPC
    /ราวีเนีย/,        // Ravinia NPC
    /ฟิลลาเบลโท/,      // Philabello NPC
    /\(การ[^)]+\)\s*$/, // ends with (method) like "(การตากแห้ง)"
  ]
  return triggers.some(r => r.test(text))
}

/** Parse "ชื่อไอเทม x 800" → { name, qty }. */
function parseName(raw) {
  const match = raw.match(/^([\s\S]+?)\s*x\s*(\d[\d,]*)\s*$/)
  if (match) {
    return { name: match[1].trim(), qty: parseInt(match[2].replace(/,/g, ''), 10) }
  }
  return { name: raw, qty: null }
}

// ── input ─────────────────────────────────────────────────────────────────

async function readInput() {
  const fileArg = process.argv.slice(2).find(a => !a.startsWith('--'))
  if (fileArg) return readFileSync(fileArg, 'utf8')
  if (process.stdin.isTTY) {
    console.error('Usage: node scripts/extract-items.mjs <file.html> [--csv|--debug]')
    process.exit(1)
  }
  const lines = []
  const rl = createInterface({ input: process.stdin, terminal: false })
  for await (const line of rl) lines.push(line)
  return lines.join('\n')
}

// ── main ──────────────────────────────────────────────────────────────────

const html    = await readInput()
const isCsv   = process.argv.includes('--csv')
const isDebug = process.argv.includes('--debug')
const rows    = extractRows(html)

const results = []
let   currentSection     = null   // most recent colspan header text
let   sectionImageDone   = false  // have we already captured the icon for this section?

for (const row of rows) {
  // ── section header row ────────────────────────────────────────────────
  if (isSectionHeader(row)) {
    const text = stripTags(row)
    if (!text) continue

    // Skip transition headers like "เรือA → เรือB" — those aren't item names
    if (text.includes('→')) {
      currentSection   = null
      sectionImageDone = false
      continue
    }

    const cleaned = cleanSectionTitle(text)
    if (isBadSection(cleaned)) {
      if (isDebug) console.error('[SECTION SKIP]', cleaned)
      continue                      // keep currentSection from the previous good header
    }
    currentSection   = cleaned
    sectionImageDone = false
    if (isDebug) console.error('[SECTION]', cleaned)
    continue
  }

  // ── data row ──────────────────────────────────────────────────────────
  const cells = extractCells(row)
  if (cells.length < 1) continue

  // Find which cell carries the image (any column)
  let imgCellIdx = -1
  let imageUrl   = null
  for (let i = 0; i < cells.length; i++) {
    const m = cells[i].match(/<img[^>]+src="([^"]+)"/)
    if (m) { imgCellIdx = i; imageUrl = m[1]; break }
  }
  if (imgCellIdx === -1) continue

  // Type C: image cell also contains the item name (img + text in same td).
  // Clean the raw text the same way we clean section titles (strips craft-location
  // suffixes and trailing parenthetical type lists like ": (ฉุกเฉิน, สมดุล, ...)").
  const imgCellText = cleanSectionTitle(stripTags(cells[imgCellIdx]))
  if (imgCellText && !isAcquisitionDesc(imgCellText)) {
    // When a section is active and unseen, the product is the section header —
    // emit it first (TYPE-B), then also emit the ingredient (TYPE-C).
    if (currentSection && !sectionImageDone) {
      const { name: sn, qty: sq } = parseName(currentSection)
      if (isDebug) console.error(`  [TYPE-B] "${sn}" ← section, img=${imageUrl.split('/').pop().slice(0,20)}`)
      results.push({ name: sn, qty: sq, imageUrl })
      sectionImageDone = true
    }
    const { name, qty } = parseName(imgCellText)
    if (isDebug) console.error(`  [TYPE-C] "${name}", img=${imageUrl.split('/').pop().slice(0,20)}`)
    results.push({ name, qty, imageUrl })
    continue
  }

  // Type A / B: name or acquisition desc is in the next cell
  const nextCell = cells[imgCellIdx + 1]
  if (!nextCell) continue
  const rawText = stripTags(nextCell)
  if (!rawText) continue

  if (isAcquisitionDesc(rawText)) {
    // Type B row: col2 = acquisition description.
    // Use the section header as the item name — but only once per section.
    if (currentSection && !sectionImageDone) {
      const { name, qty } = parseName(currentSection)
      if (isDebug) console.error(`  [TYPE-B] "${name}" ← section, img=${imageUrl.split('/').pop().slice(0,20)}`)
      results.push({ name, qty, imageUrl })
      sectionImageDone = true
    }
  } else {
    // Type A row: next cell = item name directly.
    const { name, qty } = parseName(rawText)
    if (isDebug) console.error(`  [TYPE-A] "${name}", img=${imageUrl.split('/').pop().slice(0,20)}`)
    results.push({ name, qty, imageUrl })
  }
}

// ── output ────────────────────────────────────────────────────────────────

if (results.length === 0) {
  console.error('No items found.')
  process.exit(1)
}

if (isCsv) {
  console.log('name,qty,imageUrl')
  for (const r of results) {
    const name = `"${r.name.replace(/"/g, '""')}"`
    console.log(`${name},${r.qty ?? ''},${r.imageUrl}`)
  }
} else {
  console.log(JSON.stringify(results, null, 2))
}
