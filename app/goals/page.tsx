import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeGap, overallProgress } from '@/lib/gap-analysis'
import type { Tables } from '@/lib/types/database'
import { VARIANT_HULL } from '@/lib/ships'
import GoalsList, { type GoalVM } from './goals-list'

type GoalRecord  = Tables<'user_goals'>
type ItemRecord  = { item_id: number; name: string; name_th: string | null; grade: string; category: string; image_url: string | null }
type StageRecord = { stage_id: number; ship_name: string; variant: string }

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: goals },
    { data: inventory },
    { data: recipes },
    { data: ingredients },
    { data: allItems },
    { data: stages },
  ] = await Promise.all([
    supabase.from('user_goals').select('*').eq('user_id', user.id).order('is_active', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
    supabase.from('recipes').select('recipe_id, output_item_id, output_qty'),
    supabase.from('recipe_ingredients').select('recipe_id, item_id, qty'),
    supabase.from('items').select('item_id, name, name_th, grade, category, image_url, crow_coin_price'),
    supabase.from('ship_stages').select('stage_id, ship_name, variant'),
  ])

  const itemMap  = new Map((allItems ?? []).map(i => [i.item_id, i as ItemRecord]))
  const stageMap = new Map((stages   ?? []).map(s => [s.stage_id, s as StageRecord]))
  const itemIdByName = new Map((allItems ?? []).map(i => [i.name, i.item_id]))

  const gapParams = {
    recipes:     recipes     ?? [],
    ingredients: ingredients ?? [],
    inventory:   inventory   ?? [],
    itemMeta:    allItems    ?? [],
  }

  const vms: GoalVM[] = ((goals as GoalRecord[]) ?? []).map(goal => {
    const item    = goal.item_id ? itemMap.get(goal.item_id) ?? null : null
    const isShip  = goal.current_stage_id != null
    const stage   = goal.current_stage_id ? stageMap.get(goal.current_stage_id) ?? null : null

    // Ship goals stop the chain at the hull the player already owns (matches the detail view).
    const hullName     = stage ? VARIANT_HULL[stage.variant] : undefined
    const stopAtItemId = hullName ? itemIdByName.get(hullName) ?? null : null

    const rows = goal.item_id
      ? computeGap({ ...gapParams, targetItemId: goal.item_id, targetQty: goal.target_qty, stopAtItemId })
      : []
    const total   = rows.length
    const missing = rows.filter(r => r.missing > 0).length

    const subtitle = isShip
      ? (stage && stage.variant !== 'none' ? `Starting from ${stage.ship_name}` : 'Starting fresh')
      : (goal.target_qty > 1 ? `${item?.name ?? ''} ×${goal.target_qty}` : item?.name ?? null)

    return {
      id:       goal.id,
      name:     item?.name ?? `Item #${goal.item_id}`,
      nameTh:   item?.name_th ?? null,
      grade:    item?.grade ?? 'white',
      imageUrl: item?.image_url ?? null,
      type:     isShip ? 'ship' : 'equipment',
      isActive: goal.is_active,
      progress: overallProgress(rows),
      ready:    total - missing,
      total,
      subtitle,
    }
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Goals</h1>
          <p className="mt-0.5 text-xs text-gray-500">One ship goal and one equipment goal can be active at a time — pause others to switch.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/goals/new" className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:border-gray-500">
            + Ship Goal
          </Link>
          <Link href="/goals/new?type=equipment" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
            + Equipment Goal
          </Link>
        </div>
      </div>

      {vms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-16 text-center">
          <p className="mb-4 text-gray-400">No goals yet.</p>
          <Link href="/goals/new" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500">
            Set your first Carrack goal
          </Link>
        </div>
      ) : (
        <GoalsList goals={vms} />
      )}
    </div>
  )
}
