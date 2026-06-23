#!/usr/bin/env node
/**
 * Scrape BDO barter / trade items from bdocodex.com by iterating item IDs.
 *
 * For each ID it fetches the EN and TH item pages and pulls everything from the
 * server-rendered <meta og:*> tags + grade class — no JS execution needed:
 *
 *   name      ← EN og:title  "[Level 1] Dried Blue Rose"  → "Dried Blue Rose"
 *   name_th   ← TH og:title  "[ระดับ 1] กุหลาบฟ้าตากแห้ง"   → "กุหลาบฟ้าตากแห้ง"
 *   grade     ← class="... grade_frame_N"                 → white|green|blue|…
 *   level     ← the "[Level N]" prefix                    → barter tier (1-5)
 *   image_url ← og:image  .../00800001.webp
 *
 * Raw HTML is cached under scripts/cache/ so re-runs don't re-hit the site.
 *
 * Usage:
 *   node scripts/scrape-barter-items.mjs --start 800001 --end 800100
 *   node scripts/scrape-barter-items.mjs --ids 800001,800002,800050
 *   node scripts/scrape-barter-items.mjs --start 800001 --end 800100 --images
 *   node scripts/scrape-barter-items.mjs --start 800001 --end 800100 --barter-only
 *
 * Flags:
 *   --start N --end N   inclusive ID range to iterate (default 800001..800200)
 *   --ids a,b,c         explicit ID list (overrides --start/--end)
 *   --images            also download + convert icons to public/images/barter/<id>.png
 *   --barter-only       skip items whose description isn't a barter/trade item
 *   --no-cache          ignore cached HTML and always re-fetch
 *   --concurrency N     parallel item fetches (default 4)
 *   --out PATH          output JSON path (default barter-items.json at repo root)
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')
const CACHE_DIR = path.join(__dirname, 'cache')
const IMG_DIR   = path.join(ROOT, 'public/images/barter')

const HOST = 'https://bdocodex.com'
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// bdocodex grade_frame_N → app grade name (BDO rarity colors)
const GRADE = ['white', 'green', 'blue', 'yellow', 'orange', 'red']

// ── args ────────────────────────────────────────────────────────────────────

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : fallback
}
const has = name => process.argv.includes(`--${name}`)

const idsArg      = arg('ids')
const start       = parseInt(arg('start', '800001'), 10)
const end         = parseInt(arg('end', '800200'), 10)
const concurrency = parseInt(arg('concurrency', '4'), 10)
const outPath     = path.resolve(ROOT, arg('out', 'barter-items.json'))
const wantImages  = has('images')
const barterOnly  = has('barter-only')
const useCache    = !has('no-cache')

const ids = idsArg
  ? idsArg.split(',').map(s => parseInt(s.trim(), 10)).filter(Number.isFinite)
  : Array.from({ length: end - start + 1 }, (_, i) => start + i)

// ── fetch with cache + retry ─────────────────────────────────────────────────

async function exists(p) {
  try { await access(p, constants.F_OK); return true } catch { return false }
}

async function fetchPage(lang, id) {
  const cacheFile = path.join(CACHE_DIR, `${lang}-${id}.html`)
  if (useCache && await exists(cacheFile)) {
    return readFile(cacheFile, 'utf8')
  }
  const url = `${HOST}/${lang}/item/${id}/`
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': lang } })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.text()
      await mkdir(CACHE_DIR, { recursive: true })
      await writeFile(cacheFile, body)
      return body
    } catch (err) {
      lastErr = err
      await sleep(400 * attempt)
    }
  }
  throw lastErr
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── parse ────────────────────────────────────────────────────────────────────

function meta(html, prop) {
  const m = html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`, 'i'))
  return m ? decode(m[1]) : null
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim()
}

/** Split "[Level 1] Name" / "[ระดับ 1] ชื่อ" → { level, name }. */
function splitLevel(title) {
  if (!title) return { level: null, name: null }
  const m = title.match(/^\[(?:Level|ระดับ)\s*(\d+)\]\s*(.+)$/i)
  if (m) return { level: parseInt(m[1], 10), name: m[2].trim() }
  return { level: null, name: title.trim() }
}

function parseGrade(html) {
  const m = html.match(/grade_frame_(\d)/i) || html.match(/item_grade_(\d)/i)
  if (!m) return 'white'
  return GRADE[parseInt(m[1], 10)] ?? 'white'
}

function parseOne(id, enHtml, thHtml) {
  // A non-existent ID still returns 200 but with no item og:image icon.
  const ogImage = meta(enHtml, 'og:image') || meta(thHtml, 'og:image')
  if (!ogImage || !/new_icon/i.test(ogImage)) return null

  const en = splitLevel(meta(enHtml, 'og:title'))
  const th = splitLevel(meta(thHtml ?? '', 'og:title'))
  if (!en.name) return null

  const desc = meta(enHtml, 'og:description') ?? ''
  const isBarter = /barter/i.test(desc) || /10_free_tradeitem/i.test(ogImage)
  if (barterOnly && !isBarter) return null

  return {
    id,
    name:      en.name,
    name_th:   th.name,
    grade:     parseGrade(enHtml),
    level:     en.level ?? th.level,
    image_url: ogImage.startsWith('http') ? ogImage : `${HOST}${ogImage}`,
    is_barter: isBarter,
  }
}

// ── images (optional) ────────────────────────────────────────────────────────

let sharp = null
async function toPng(remoteUrl, id) {
  if (!sharp) sharp = (await import('sharp')).default
  const dest = path.join(IMG_DIR, `${id}.png`)
  if (await exists(dest)) return `/images/barter/${id}.png`
  const res = await fetch(remoteUrl, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`image HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(IMG_DIR, { recursive: true })
  await sharp(buf).png().toFile(dest)
  return `/images/barter/${id}.png`
}

// ── concurrency pool ─────────────────────────────────────────────────────────

async function pool(items, limit, worker) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const i = next++
        if (i >= items.length) break
        out[i] = await worker(items[i], i)
      }
    }),
  )
  return out
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log(`Scraping ${ids.length} IDs (${ids[0]}…${ids[ids.length - 1]}), concurrency=${concurrency}${useCache ? '' : ', no-cache'}${barterOnly ? ', barter-only' : ''}`)

let found = 0, missing = 0, errored = 0
const results = []

await pool(ids, concurrency, async id => {
  try {
    const [enHtml, thHtml] = await Promise.all([fetchPage('en', id), fetchPage('th', id)])
    if (!enHtml) { missing++; return }

    const item = parseOne(id, enHtml, thHtml)
    if (!item) { missing++; return }

    if (wantImages) {
      try { item.image_url = await toPng(item.image_url, id) }
      catch (e) { console.error(`  [${id}] image failed: ${e.message}`) }
    }

    results.push(item)
    found++
    console.log(`  ✓ [${id}] ${item.name} · ${item.grade}${item.level ? ` · Lv${item.level}` : ''}`)
  } catch (err) {
    errored++
    console.error(`  ✗ [${id}] ${err.message}`)
  }
})

results.sort((a, b) => a.id - b.id)
await writeFile(outPath, JSON.stringify(results, null, 2))

console.log(`\nDone: ${found} found, ${missing} missing, ${errored} errored.`)
console.log(`Wrote ${results.length} items → ${path.relative(ROOT, outPath)}`)
if (wantImages) console.log(`Images → ${path.relative(ROOT, IMG_DIR)}/`)
