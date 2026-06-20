import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeGap } from '@/lib/gap-analysis'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  const { goalId } = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rawGoal } = await supabase
    .from('user_goals')
    .select('id, item_id, target_qty, is_active, use_daily_quests, created_at, user_id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (!rawGoal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  const goal = rawGoal as Tables<'user_goals'>

  if (!goal.item_id) return NextResponse.json({ error: 'Goal has no target item' }, { status: 400 })

  const [{ data: recipes }, { data: ingredients }, { data: allItems }, { data: inventory }] =
    await Promise.all([
      supabase.from('recipes').select('recipe_id, output_item_id, output_qty'),
      supabase.from('recipe_ingredients').select('recipe_id, item_id, qty'),
      supabase.from('items').select('item_id, name, name_th, grade, category, tier, image_url'),
      supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
    ])

  const rows = computeGap({
    targetItemId: goal.item_id,
    targetQty:    goal.target_qty,
    recipes:      (recipes as Tables<'recipes'>[]) ?? [],
    ingredients:  (ingredients as Tables<'recipe_ingredients'>[]) ?? [],
    inventory:    (inventory as Tables<'user_inventory'>[]) ?? [],
    itemMeta:     (allItems as Tables<'items'>[]) ?? [],
  })

  const missing = rows.filter(r => r.missing > 0)
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing: ${missing.map(r => r.name).join(', ')}` }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No recipe for this item' }, { status: 400 })
  }

  const invMap = new Map((inventory ?? []).map(i => [(i as Tables<'user_inventory'>).item_id, (i as Tables<'user_inventory'>).qty_have]))

  // Debit all ingredients
  for (const row of rows) {
    const current = invMap.get(row.itemId) ?? 0
    const newQty  = current - row.needed
    if (newQty < 0) return NextResponse.json({ error: `Insufficient ${row.name}` }, { status: 400 })
    const upsert: TablesInsert<'user_inventory'> = { user_id: user.id, item_id: row.itemId, qty_have: newQty }
    const { error } = await supabase.from('user_inventory').upsert(upsert, { onConflict: 'user_id,item_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Credit output
  const outputRecipe = (recipes ?? []).find(r => (r as Tables<'recipes'>).output_item_id === goal.item_id) as Tables<'recipes'> | undefined
  if (outputRecipe && goal.item_id) {
    const outputCurrent = invMap.get(goal.item_id) ?? 0
    const outputUpsert: TablesInsert<'user_inventory'> = {
      user_id:  user.id,
      item_id:  goal.item_id,
      qty_have: outputCurrent + outputRecipe.output_qty * goal.target_qty,
    }
    await supabase.from('user_inventory').upsert(outputUpsert, { onConflict: 'user_id,item_id' })

    // Log craft
    const logInsert: TablesInsert<'user_recipe_log'> = {
      user_id:         user.id,
      recipe_id:       outputRecipe.recipe_id,
      times_crafted:   goal.target_qty,
      last_crafted_at: new Date().toISOString(),
    }
    await supabase.from('user_recipe_log').upsert(logInsert, { onConflict: 'user_id,recipe_id' })
  }

  // Mark goal complete
  const goalUpdate: TablesUpdate<'user_goals'> = { is_active: false }
  await supabase.from('user_goals').update(goalUpdate).eq('id', goal.id)

  return NextResponse.json({ ok: true })
}
