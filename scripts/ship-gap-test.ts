// Verify computeGapTree's hull-chain expansion + stopAtItemId truncation against LIVE catalogue data.
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

async function main() {
  const [{ data: recipes }, { data: ingredients }, { data: items }] = await Promise.all([
    sb.from('recipes').select('recipe_id, output_item_id, output_qty'),
    sb.from('recipe_ingredients').select('recipe_id, item_id, qty'),
    sb.from('items').select('item_id, name, name_th, grade, category, image_url, crow_coin_price'),
  ])
  if (!recipes || !ingredients || !items) throw new Error('catalogue fetch failed (RLS? env?)')

  const CARAVEL = 91, SAILBOAT_MOD = 89, SAILBOAT = 87, BATALI = 86
  const base = { recipes, ingredients, inventory: [] as { item_id: number; qty_have: number }[], itemMeta: items }

  // A) No current ship → full hull chain expands down to Batali (86).
  const noStop = computeGapTree({ targetItemId: CARAVEL, targetQty: 1, ...base, stopAtItemId: null })
  const modRow = noStop.find(r => r.itemId === SAILBOAT_MOD)
  const a1 = !!modRow                                  // Sailboat(Mod) is a direct ingredient of Caravel
  // subRows flatten the sub-recipe to raw leaves; the build chain reaches Batali (86), the chain root.
  const a2 = !!modRow && modRow.subRows.some(s => s.itemId === BATALI)
  const a3 = findInTree(noStop, BATALI)               // chain reaches Batali somewhere

  // B) Own Sailboat(Modified) → that branch is satisfied, not expanded.
  const stopMod = computeGapTree({ targetItemId: CARAVEL, targetQty: 1, ...base, stopAtItemId: SAILBOAT_MOD })
  const modRow2 = stopMod.find(r => r.itemId === SAILBOAT_MOD)
  const b1 = !!modRow2 && modRow2.missing === 0       // owned → nothing missing
  const b2 = !!modRow2 && modRow2.subRows.length === 0 // not expanded
  const b3 = !findInTree(stopMod, SAILBOAT)           // predecessor no longer appears

  // C) Own only Epheria Sailboat → chain truncates there, Batali no longer needed.
  const stopSail = computeGapTree({ targetItemId: CARAVEL, targetQty: 1, ...base, stopAtItemId: SAILBOAT })
  const c1 = findInTree(stopSail, SAILBOAT)           // truncation point still listed
  const c2 = !findInTree(stopSail, BATALI)            // below it pruned

  // D) Balance Carrack, no current ship → needs the Caravel hull, build path expands. (mirrors live goal 13)
  const BALANCE = 82, VOLANTE = 84, GALLEASS = 92
  const balanceNoStop = computeGapTree({ targetItemId: BALANCE, targetQty: 1, ...base, stopAtItemId: null })
  const caravelRow = balanceNoStop.find(r => r.itemId === CARAVEL)
  const d1 = !!caravelRow                                     // Caravel is now a direct ingredient of Balance
  const d2 = !!caravelRow && caravelRow.subRows.length > 0    // its build path expands
  const d3 = !!caravelRow && caravelRow.missing > 0           // not yet owned → counted as needed

  // E) Volante Carrack, current ship = Galleass → hull satisfied, not expanded. (mirrors live goals 8/16/17)
  const volanteOwnHull = computeGapTree({ targetItemId: VOLANTE, targetQty: 1, ...base, stopAtItemId: GALLEASS })
  const galleassRow = volanteOwnHull.find(r => r.itemId === GALLEASS)
  const e1 = !!galleassRow && galleassRow.missing === 0       // owned → satisfied
  const e2 = !!galleassRow && galleassRow.subRows.length === 0 // not expanded

  const checks: [string, boolean][] = [
    ['A1 Caravel needs Sailboat(Mod)', a1], ['A2 Sailboat(Mod) chain expands', a2], ['A3 chain reaches Batali', a3],
    ['B1 owned Sailboat(Mod) missing=0', b1], ['B2 owned branch not expanded', b2], ['B3 Sailboat pruned', b3],
    ['C1 Sailboat is truncation point', c1], ['C2 Batali pruned below it', c2],
    ['D1 Balance Carrack needs Caravel hull', d1], ['D2 Caravel build path expands', d2], ['D3 Caravel counted as needed', d3],
    ['E1 owned Galleass hull missing=0', e1], ['E2 owned hull not expanded', e2],
  ]
  let ok = true
  for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`); ok = ok && pass }
  console.log(ok ? '\n✅ all checks passed' : '\n❌ FAILURES above')
  process.exit(ok ? 0 : 1)
}

main()
