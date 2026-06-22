// Verify computeGapTree against LIVE catalogue data, post "T3 builds from base hull" fix.
// Critical path is direct: Caravel <- Epheria Sailboat, Galleass <- Epheria Frigate.
// The "(Modified)" ships are an optional side-branch and must NOT appear as required.
// Run: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/ship-gap-test.ts
import { createClient } from '@supabase/supabase-js'
import { computeGapTree, type GapTreeRow } from '../lib/gap-analysis'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

function findInTree(rows: GapTreeRow[], itemId: number): boolean {
  for (const r of rows) {
    if (r.itemId === itemId) return true
    if (r.subRows.some(s => s.itemId === itemId)) return true
  }
  return false
}

const CARAVEL = 91, GALLEASS = 92, SAILBOAT = 87, FRIGATE = 88, BATALI = 86
const SAILBOAT_MOD = 89, FRIGATE_MOD = 90, BALANCE = 82, VOLANTE = 84

async function main() {
  const [{ data: recipes }, { data: ingredients }, { data: items }] = await Promise.all([
    sb.from('recipes').select('recipe_id, output_item_id, output_qty'),
    sb.from('recipe_ingredients').select('recipe_id, item_id, qty'),
    sb.from('items').select('item_id, name, name_th, grade, category, image_url, crow_coin_price'),
  ])
  if (!recipes || !ingredients || !items) throw new Error('catalogue fetch failed (RLS? env?)')

  const base = { recipes, ingredients, inventory: [] as { item_id: number; qty_have: number }[], itemMeta: items }
  const tree = (targetItemId: number, stopAtItemId: number | null) =>
    computeGapTree({ targetItemId, targetQty: 1, ...base, stopAtItemId })

  // A) Caravel from scratch → built directly from Epheria Sailboat; Modified Sailboat NOT required.
  const caravel = tree(CARAVEL, null)
  const sailRow = caravel.find(r => r.itemId === SAILBOAT)
  const a1 = !!sailRow                                       // Sailboat is a direct ingredient of Caravel
  const a2 = !!sailRow && sailRow.subRows.some(s => s.itemId === BATALI) // its chain reaches Batali
  const a3 = !findInTree(caravel, SAILBOAT_MOD)             // optional Modified Sailboat not on the path

  // B) Own an Epheria Sailboat → satisfied, chain pruned.
  const caravelStop = tree(CARAVEL, SAILBOAT)
  const sailRow2 = caravelStop.find(r => r.itemId === SAILBOAT)
  const b1 = !!sailRow2 && sailRow2.missing === 0
  const b2 = !!sailRow2 && sailRow2.subRows.length === 0
  const b3 = !findInTree(caravelStop, BATALI)

  // C) Galleass, current ship = plain Frigate (the reported case): Frigate satisfies it directly,
  //    and the Modified Frigate must NOT appear as needed anymore.
  const galleassFromFrig = tree(GALLEASS, FRIGATE)
  const frigRow = galleassFromFrig.find(r => r.itemId === FRIGATE)
  const c1 = !!frigRow && frigRow.missing === 0             // owned Frigate satisfies the hull
  const c2 = !!frigRow && frigRow.subRows.length === 0      // not expanded
  const c3 = !findInTree(galleassFromFrig, FRIGATE_MOD)     // <-- the fix: no Modified Frigate required

  // D) Galleass from scratch → built directly from Frigate; Modified Frigate NOT required.
  const galleass = tree(GALLEASS, null)
  const gFrig = galleass.find(r => r.itemId === FRIGATE)
  const d1 = !!gFrig                                        // Frigate is a direct ingredient of Galleass
  const d2 = !!gFrig && gFrig.subRows.some(s => s.itemId === BATALI)
  const d3 = !findInTree(galleass, FRIGATE_MOD)

  // E) Carrack still consumes its T3 hull (unaffected by the fix).
  const balance = tree(BALANCE, null)
  const e1 = !!balance.find(r => r.itemId === CARAVEL && r.missing > 0)  // Balance Carrack needs a Caravel
  const volante = tree(VOLANTE, GALLEASS)
  const galRow = volante.find(r => r.itemId === GALLEASS)
  const e2 = !!galRow && galRow.missing === 0 && galRow.subRows.length === 0 // owned Galleass satisfies it

  const checks: [string, boolean][] = [
    ['A1 Caravel built from Sailboat', a1], ['A2 Sailboat chain reaches Batali', a2], ['A3 Modified Sailboat not required', a3],
    ['B1 owned Sailboat missing=0', b1], ['B2 owned Sailboat not expanded', b2], ['B3 Batali pruned', b3],
    ['C1 Galleass from Frigate: hull satisfied', c1], ['C2 Frigate not expanded', c2], ['C3 NO Modified Frigate required', c3],
    ['D1 Galleass built from Frigate', d1], ['D2 Frigate chain reaches Batali', d2], ['D3 Modified Frigate not required', d3],
    ['E1 Balance Carrack needs Caravel hull', e1], ['E2 owned Galleass hull satisfied', e2],
  ]
  let ok = true
  for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`); ok = ok && pass }
  console.log(ok ? '\n✅ all checks passed' : '\n❌ FAILURES above')
  process.exit(ok ? 0 : 1)
}

main()
