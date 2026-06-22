import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeGap, overallProgress } from '@/lib/gap-analysis'
import type { Tables } from '@/lib/types/database'
import { VARIANT_HULL } from '@/lib/ships'
import ShipTree from './components/ship-tree'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: goals },
    { data: inventory },
    { data: recipes },
    { data: ingredients },
    { data: allItems },
    { data: profile },
    { data: stages },
  ] = await Promise.all([
    supabase.from('user_goals').select('*').eq('user_id', user.id).order('is_active', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
    supabase.from('recipes').select('recipe_id, output_item_id, output_qty'),
    supabase.from('recipe_ingredients').select('recipe_id, item_id, qty'),
    supabase.from('items').select('item_id, name, name_th, grade, category, tier'),
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase.from('ship_stages').select('stage_id, ship_name, variant'),
  ])

  const typedGoals = (goals as Tables<'user_goals'>[] | null) ?? []
  const activeGoal = typedGoals.find(g => g.current_stage_id != null) ?? typedGoals[0] ?? null

  const stageMap = new Map((stages ?? []).map(s => [s.stage_id, s]))

  const currentStage = activeGoal?.current_stage_id
    ? stageMap.get(activeGoal.current_stage_id)
    : null

  const goalItem = activeGoal?.item_id
    ? (allItems ?? []).find(i => i.item_id === activeGoal.item_id)
    : null

  const goalVariant =
    goalItem?.name?.toLowerCase().includes('advance')  ? 'advance'
    : goalItem?.name?.toLowerCase().includes('balance')  ? 'balance'
    : goalItem?.name?.toLowerCase().includes('valor')    ? 'valor'
    : goalItem?.name?.toLowerCase().includes('volante')  ? 'volante'
    : null

  const stopAtItemId = currentStage
    ? (allItems ?? []).find(i => i.name === VARIANT_HULL[currentStage.variant])?.item_id ?? null
    : null

  const gapRows = activeGoal?.item_id ? computeGap({
    targetItemId: activeGoal.item_id,
    targetQty:    activeGoal.target_qty,
    recipes:      recipes ?? [],
    ingredients:  ingredients ?? [],
    inventory:    inventory ?? [],
    itemMeta:     allItems ?? [],
    stopAtItemId,
  }) : []

  const progress     = overallProgress(gapRows)
  const missingCount = gapRows.filter(r => r.missing > 0).length
  const totalCount   = gapRows.length

  const username = profile?.username ?? 'Captain'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header — chart-room command banner */}
      <div
        data-tour="captain-log-header"
        className="mb-7 flex items-end justify-between rounded-2xl px-7 py-6"
        style={{
          background: 'linear-gradient(135deg, var(--ink-surface) 0%, rgba(11,18,32,0.8) 100%)',
          border: '1px solid rgba(200, 168, 75, 0.18)',
        }}
      >
        <div>
          <p
            className="mb-1 text-xs font-display tracking-[0.25em] uppercase"
            style={{ color: 'rgba(200,168,75,0.5)' }}
          >
            Captain&rsquo;s Log
          </p>
          <h1
            className="font-display text-3xl font-semibold tracking-wider"
            style={{ color: 'var(--brass-light)' }}
          >
            {username}
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#7a7464' }}>
            Epheria Carrack Expedition Tracker
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(goals?.length ?? 0) > 1 && (
            <Link
              href="/goals"
              className="rounded-xl border px-4 py-2 text-sm font-display tracking-wider transition-colors text-[#6b7a8d] border-[rgba(200,168,75,0.15)] hover:text-[#c8c3b4] hover:border-[rgba(200,168,75,0.3)]"
            >
              All goals ({goals!.length})
            </Link>
          )}
          <Link
            href="/goals/new"
            data-tour="new-goal"
            className="rounded-xl px-5 py-2 text-sm font-display font-semibold tracking-widest transition-all"
            style={{
              background: 'linear-gradient(135deg, #c8a84b 0%, #9a7d34 100%)',
              color: '#060a12',
              boxShadow: '0 2px 12px rgba(200, 168, 75, 0.25)',
            }}
          >
            + New Goal
          </Link>
        </div>
      </div>

      {/* Ship progression tree */}
      <div data-tour="ship-tree">
        <ShipTree
          currentVariant={currentStage?.variant ?? null}
          goalVariant={goalVariant}
          progress={progress}
          missingCount={missingCount}
          totalCount={totalCount}
          goalId={activeGoal?.id ?? null}
        />
      </div>
    </div>
  )
}
