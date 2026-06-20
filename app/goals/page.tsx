import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeGap, overallProgress, mergeGaps } from '@/lib/gap-analysis'
import type { GapRow } from '@/lib/gap-analysis'
import type { Tables } from '@/lib/types/database'
import ShipGoalImage from './ship-goal-image'
import GoalDeleteButton from './goal-delete-button'

type GoalRecord = Tables<'user_goals'>
type ItemRecord = {
  item_id:   number
  name:      string
  name_th:   string | null
  grade:     string
  category:  string
  image_url: string | null
}
type StageRecord = { stage_id: number; ship_name: string; variant: string }

function deriveVariant(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes('advance')) return 'advance'
  if (n.includes('balance')) return 'balance'
  if (n.includes('valor'))   return 'valor'
  if (n.includes('volante')) return 'volante'
  return null
}

const GRADE_BG: Record<string, string> = {
  white:  '#1f2937',
  green:  '#14290d',
  blue:   '#0c1a2e',
  yellow: '#2a1f00',
  orange: '#2a1000',
  red:    '#2a0a0a',
}

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
    supabase.from('user_goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
    supabase.from('recipes').select('recipe_id, output_item_id, output_qty'),
    supabase.from('recipe_ingredients').select('recipe_id, item_id, qty'),
    supabase.from('items').select('item_id, name, name_th, grade, category, image_url, crow_coin_price'),
    supabase.from('ship_stages').select('stage_id, ship_name, variant'),
  ])

  const itemMap  = new Map((allItems  ?? []).map(i => [i.item_id, i as ItemRecord]))
  const stageMap = new Map((stages    ?? []).map(s => [s.stage_id, s as StageRecord]))

  const activeGoals = goals as GoalRecord[] ?? []

  // Discriminant: ship goals have current_stage_id; equipment goals don't
  const shipGoals  = activeGoals.filter(g => g.current_stage_id != null)
  const equipGoals = activeGoals.filter(g => g.current_stage_id == null)

  const activeShipGoal: GoalRecord | null = shipGoals[0] ?? null

  const shipGoalItem     = activeShipGoal?.item_id ? (itemMap.get(activeShipGoal.item_id) ?? null) : null
  const shipGoalVariant  = shipGoalItem ? deriveVariant(shipGoalItem.name) : null
  const shipCurrentStage = activeShipGoal?.current_stage_id
    ? (stageMap.get(activeShipGoal.current_stage_id) ?? null)
    : null

  const gapParams = {
    recipes:     recipes     ?? [],
    ingredients: ingredients ?? [],
    inventory:   inventory   ?? [],
    itemMeta:    allItems    ?? [],
  }

  const shipGapRows: GapRow[] = activeShipGoal?.item_id
    ? computeGap({ ...gapParams, targetItemId: activeShipGoal.item_id, targetQty: activeShipGoal.target_qty })
    : []

  const shipProgress = overallProgress(shipGapRows)
  const shipMissing  = shipGapRows.filter(r => r.missing > 0).length
  const shipTotal    = shipGapRows.length

  type EquipGoalData = {
    goal:     GoalRecord
    item:     ItemRecord | null
    rows:     GapRow[]
    progress: number
    missing:  number
    total:    number
  }

  const equipGoalsData: EquipGoalData[] = equipGoals.map(goal => {
    const item = goal.item_id ? (itemMap.get(goal.item_id) ?? null) : null
    const rows = goal.item_id
      ? computeGap({ ...gapParams, targetItemId: goal.item_id, targetQty: goal.target_qty })
      : []
    return {
      goal,
      item,
      rows,
      progress: overallProgress(rows),
      missing:  rows.filter(r => r.missing > 0).length,
      total:    rows.length,
    }
  })

  const combinedRows     = mergeGaps([shipGapRows, ...equipGoalsData.map(e => e.rows)])
    .filter(r => r.category !== 'equipment')
  const combinedProgress = overallProgress(combinedRows)
  const combinedMissing  = combinedRows.filter(r => r.missing > 0).length
  const combinedTotal    = combinedRows.length

  const hasAnyGoal = activeGoals.length > 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Goals</h1>
        <div className="flex gap-3">
          <Link
            href="/goals/new"
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"
          >
            + Ship Goal
          </Link>
          <Link
            href="/goals/new?type=equipment"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
          >
            + Equipment Goal
          </Link>
        </div>
      </div>

      {!hasAnyGoal && (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-16 text-center">
          <p className="mb-4 text-gray-400">No active goals yet.</p>
          <Link
            href="/goals/new"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500"
          >
            Set your first Carrack goal
          </Link>
        </div>
      )}

      {hasAnyGoal && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">

          {/* ── Column 1: Ship Goal ─────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
            <ShipGoalImage
              variant={shipGoalVariant}
              name={shipGoalItem?.name ?? 'Ship Goal'}
              className="h-36 w-full"
            />
            {activeShipGoal && shipGoalItem ? (
              <div className="space-y-4 p-5">
                <div>
                  <p className={`text-lg font-bold grade-${shipGoalItem.grade}`}>{shipGoalItem.name_th ?? shipGoalItem.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{shipGoalItem.name}</p>
                </div>
                {shipCurrentStage && shipCurrentStage.variant !== 'none' && (
                  <p className="text-sm text-gray-400">
                    Starting from:{' '}
                    <span className="font-medium text-amber-400">{shipCurrentStage.ship_name}</span>
                  </p>
                )}
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-gray-500">
                    <span>{shipTotal - shipMissing} / {shipTotal} materials ready</span>
                    <span className="font-semibold text-white">{shipProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${shipProgress}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/goals/${activeShipGoal.id}`}
                    className="flex-1 rounded-lg border border-gray-700 py-2 text-center text-sm hover:border-gray-500"
                  >
                    View Materials →
                  </Link>
                  <GoalDeleteButton goalId={activeShipGoal.id} />
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="mb-3 text-sm text-gray-500">No ship goal set.</p>
                <Link href="/goals/new" className="text-xs text-blue-400 hover:text-blue-300">
                  Set Carrack target →
                </Link>
              </div>
            )}
          </div>

          {/* ── Column 2: Equipment Goals ───────────────────────────────── */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">Equipment Goals</h2>
                {equipGoalsData.length > 0 && (
                  <p className="mt-0.5 text-xs text-gray-500">{equipGoalsData.length} tracked</p>
                )}
              </div>
              <Link
                href="/goals/new?type=equipment"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Add
              </Link>
            </div>

            {equipGoalsData.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-500">No equipment goals yet.</p>
                <p className="mt-1 text-xs text-gray-600">Track crafting for specific gear pieces.</p>
                <Link
                  href="/goals/new?type=equipment"
                  className="mt-4 inline-block text-xs text-blue-400 hover:text-blue-300"
                >
                  Add equipment goal →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {equipGoalsData.map(({ goal, item, progress, missing, total }) => (
                  <div key={goal.id} className="flex items-center border-b border-gray-800 last:border-b-0">
                    <Link
                      href={`/goals/${goal.id}`}
                      className="flex flex-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-gray-800/40"
                    >
                      <div
                        className={`shrink-0 h-20 w-20 rounded-lg overflow-hidden border grade-frame-${item?.grade ?? 'white'}`}
                        style={{ backgroundColor: GRADE_BG[item?.grade ?? 'white'] ?? '#1f2937' }}
                      >
                        {item?.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium grade-${item?.grade ?? 'white'} leading-snug`}>
                          {item?.name_th ?? item?.name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-600 leading-snug">{item?.name}</p>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-gray-300">{progress}%</p>
                        <p className="text-xs text-gray-600">{total - missing}/{total}</p>
                      </div>
                    </Link>
                    <div className="shrink-0 pr-4">
                      <GoalDeleteButton goalId={goal.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Column 3: Combined Gap Analysis ─────────────────────────── */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-5 py-4">
              <h2 className="font-semibold">Combined Materials</h2>
              {combinedRows.length > 0 && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {activeGoals.length} goal{activeGoals.length !== 1 ? 's' : ''} merged · {combinedProgress}% ready
                </p>
              )}
            </div>

            {combinedRows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-500">Add goals to see combined materials.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {/* Still needed */}
                {combinedMissing > 0 && (
                  <div className="space-y-3 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Still needed ({combinedMissing})
                    </p>
                    {combinedRows.filter(r => r.missing > 0).map(row => (
                      <div key={row.itemId} className="flex items-center gap-3">
                        <div
                          className={`shrink-0 h-10 w-10 rounded-lg overflow-hidden border grade-frame-${row.grade}`}
                          style={{ backgroundColor: GRADE_BG[row.grade] ?? '#1f2937' }}
                        >
                          {row.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium font-thai grade-${row.grade} leading-snug`}>{row.nameTh ?? row.name}</span>
                            <div className="shrink-0 text-right">
                              <span className="tabular-nums text-xs text-gray-500">{row.have}/{row.needed}</span>
                              {row.crowCoinPrice != null && (
                                <p className="text-xs text-amber-500/50">🪙 {(row.crowCoinPrice * row.missing).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-gray-800">
                            <div
                              className="h-full rounded-full bg-blue-500/70"
                              style={{ width: `${row.progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ready */}
                {combinedTotal - combinedMissing > 0 && (
                  <div className="space-y-1.5 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Ready ({combinedTotal - combinedMissing})
                    </p>
                    {combinedRows.filter(r => r.missing === 0).map(row => (
                      <div key={row.itemId} className="flex items-center gap-3">
                        <div
                          className={`shrink-0 h-10 w-10 rounded-lg overflow-hidden border grade-frame-${row.grade}`}
                          style={{ backgroundColor: GRADE_BG[row.grade] ?? '#1f2937' }}
                        >
                          {row.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <span className="flex-1 text-sm font-thai text-gray-600 leading-snug">{row.nameTh ?? row.name}</span>
                        <span className="shrink-0 text-xs text-green-600">✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
