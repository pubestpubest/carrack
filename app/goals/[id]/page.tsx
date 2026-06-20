import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeGapTree, overallProgress } from '@/lib/gap-analysis'
import type { Tables } from '@/lib/types/database'
import GoalActions from './goal-actions'
import GoalDeleteButton from '../goal-delete-button'
import MaterialQtyInput from './material-qty-input'
import ExpandableEquipmentRow from './expandable-equipment-row'
import ShipGoalImage from '../ship-goal-image'

function deriveVariant(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes('advance')) return 'advance'
  if (n.includes('balance')) return 'balance'
  if (n.includes('valor'))   return 'valor'
  if (n.includes('volante')) return 'volante'
  return null
}

const CATEGORY_ORDER = ['equipment', 'material', 'stone', 'license', 'currency']
const CATEGORY_LABEL: Record<string, string> = {
  equipment: 'Ship Equipment',
  material:  'Materials',
  stone:     'Enhancement Stones',
  license:   'Licenses',
  currency:  'Currency',
}
const GRADE_PLACEHOLDER: Record<string, string> = {
  white:  '#1f2937',
  green:  '#14290d',
  blue:   '#0c1a2e',
  yellow: '#2a1f00',
  orange: '#2a1000',
  red:    '#2a0a0a',
}

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: goal }, { data: recipes }, { data: ingredients }, { data: allItems }, { data: inventory }, { data: stages }] =
    await Promise.all([
      supabase.from('user_goals').select('*').eq('id', parseInt(id)).eq('user_id', user.id).single(),
      supabase.from('recipes').select('recipe_id, output_item_id, output_qty'),
      supabase.from('recipe_ingredients').select('recipe_id, item_id, qty'),
      supabase.from('items').select('item_id, name, name_th, grade, category, tier, image_url, crow_coin_price'),
      supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
      supabase.from('ship_stages').select('stage_id, ship_name, variant'),
    ])

  if (!goal) notFound()

  const typedGoal    = goal as Tables<'user_goals'>
  const itemMeta     = typedGoal.item_id ? (allItems ?? []).find(i => i.item_id === typedGoal.item_id) : null
  const stageMap     = new Map((stages ?? []).map(s => [s.stage_id, s]))
  const currentStage = typedGoal.current_stage_id ? stageMap.get(typedGoal.current_stage_id) : null

  const isShipGoal = typedGoal.current_stage_id != null
  const variant    = isShipGoal && itemMeta?.name ? deriveVariant(itemMeta.name) : null

  const rows = typedGoal.item_id ? computeGapTree({
    targetItemId: typedGoal.item_id,
    targetQty:    typedGoal.target_qty,
    recipes:      recipes ?? [],
    ingredients:  ingredients ?? [],
    inventory:    inventory ?? [],
    itemMeta:     allItems ?? [],
  }) : []

  const progress  = overallProgress(rows)
  const missing   = rows.filter(r => r.missing > 0)
  const ready     = rows.filter(r => r.missing === 0)
  const canCraft  = missing.length === 0 && rows.length > 0
  const hasRecipe = typedGoal.item_id
    ? (recipes ?? []).some(r => r.output_item_id === typedGoal.item_id)
    : false

  const crowCoinItem   = allItems?.find(i => i.name === 'Crow Coin')
  const crowCoinHave   = inventory?.find(i => i.item_id === crowCoinItem?.item_id)?.qty_have ?? 0
  const crowCoinNeeded = rows
    .flatMap(r => [r, ...r.subRows])
    .filter(r => r.missing > 0 && r.crowCoinPrice != null)
    .reduce((sum, r) => sum + (r.crowCoinPrice! * r.missing), 0)
  const crowCoinDiff   = crowCoinHave - crowCoinNeeded

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero image for ship goals */}
      {isShipGoal && (
        <ShipGoalImage
          variant={variant}
          name={itemMeta?.name ?? 'Ship Goal'}
          className="mb-6 h-40 w-full rounded-2xl"
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold font-thai grade-${itemMeta?.grade ?? 'blue'}`}>
              {itemMeta?.name_th ?? itemMeta?.name ?? 'Goal'}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{itemMeta?.name}</p>
            {currentStage && (
              <p className="mt-1 text-sm text-gray-600">
                Starting from{' '}
                <span className="font-medium text-amber-500/80">{currentStage.ship_name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <GoalDeleteButton goalId={typedGoal.id} redirectTo="/goals" label="Remove goal" />
            <GoalActions goalId={typedGoal.id} isActive={typedGoal.is_active} canCraft={canCraft && hasRecipe} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-lg font-bold text-gray-300">Overall progress</span>
            <div className="flex items-center gap-4">
              {crowCoinNeeded > 0 && (
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-base text-amber-500/80 font-medium">
                    🪙 {crowCoinHave.toLocaleString()} / {crowCoinNeeded.toLocaleString()}
                  </span>
                  <span className={`text-base font-semibold ${crowCoinDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {crowCoinDiff >= 0 ? '+' : ''}{crowCoinDiff.toLocaleString()}
                  </span>
                </div>
              )}
              <span className="text-2xl font-bold tabular-nums text-sky-400">{progress}%</span>
            </div>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            <span className="text-green-400 font-medium">{ready.length}</span>
            <span className="text-gray-600"> / {rows.length} materials ready</span>
            {typedGoal.target_qty > 1 && (
              <span className="text-gray-600"> · Target ×{typedGoal.target_qty}</span>
            )}
          </p>
        </div>
      </div>

      {/* Materials */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 p-10 text-center">
          <p className="text-gray-500">
            No recipe found for this item.
          </p>
        </div>
      ) : (
        <MaterialsList rows={rows} />
      )}
    </div>
  )
}

type GapRowType = ReturnType<typeof computeGapTree>[number]

function MaterialsList({ rows }: { rows: GapRowType[] }) {
  const missing = rows.filter(r => r.missing > 0)
  const ready   = rows.filter(r => r.missing === 0)

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Still needed <span className="ml-1 rounded-full bg-gray-800 px-2 py-0.5 text-gray-400">{missing.length}</span>
          </p>
          <GroupedRows rows={missing} />
        </section>
      )}

      {ready.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Ready <span className="ml-1 rounded-full bg-gray-800 px-2 py-0.5 text-green-600">{ready.length}</span>
          </p>
          <div className="opacity-50">
            <GroupedRows rows={ready} />
          </div>
        </section>
      )}
    </div>
  )
}

function GroupedRows({ rows }: { rows: GapRowType[] }) {
  const groups = new Map<string, GapRowType[]>()
  for (const row of rows) {
    const list = groups.get(row.category) ?? []
    list.push(row)
    groups.set(row.category, list)
  }
  for (const catRows of groups.values()) {
    catRows.sort((a, b) => b.needed - a.needed)
  }

  const orderedCats   = CATEGORY_ORDER.filter(c => groups.has(c))
  const remainingCats = [...groups.keys()].filter(c => !CATEGORY_ORDER.includes(c))

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800">
      {[...orderedCats, ...remainingCats].map((cat, catIdx) => {
        const catRows    = groups.get(cat)!
        const categoryCost = catRows
          .filter(r => r.missing > 0 && r.crowCoinPrice != null)
          .reduce((sum, r) => sum + (r.crowCoinPrice ?? 0) * r.missing, 0)

        return (
          <div key={cat} className={catIdx > 0 ? 'border-t border-gray-800' : ''}>
            {/* Category header */}
            <div className="flex items-center gap-2 bg-gray-900/60 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {CATEGORY_LABEL[cat] ?? cat}
              </span>
              <span className="text-xs text-gray-700">{catRows.length}</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-800/60 bg-gray-950">
              {catRows.map(row => (
                row.category === 'equipment' ? (
                  <ExpandableEquipmentRow key={row.itemId} row={row} />
                ) : (
                  <div
                    key={row.itemId}
                    className="grid grid-cols-[80px_1fr_auto_56px_56px_auto] items-center gap-3 px-4 py-2.5 hover:bg-gray-900/60 transition-colors"
                  >
                    {/* Image / placeholder */}
                    <div
                      className={`h-20 w-20 rounded-lg overflow-hidden border grade-frame-${row.grade}`}
                      style={{ backgroundColor: GRADE_PLACEHOLDER[row.grade] ?? '#1f2937' }}
                    >
                      {row.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
                      )}
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                      <p className={`text-base font-medium font-thai grade-${row.grade} leading-snug`}>{row.nameTh ?? row.name}</p>
                      <p className="text-sm text-gray-600 leading-snug">{row.name}</p>
                    </div>

                    {/* Qty control + needed */}
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <MaterialQtyInput itemId={row.itemId} initialQty={row.have} />
                      <span className="text-gray-700">/</span>
                      <span className="text-gray-500 w-12 text-right text-base">{row.needed.toLocaleString()}</span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-14">
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            row.progressPct === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${row.progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Missing / check */}
                    <div className="text-right text-base tabular-nums">
                      {row.missing > 0 ? (
                        <span className="font-medium text-red-400">−{row.missing.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-500">✓</span>
                      )}
                    </div>

                    {/* Coin total */}
                    <div className="text-right tabular-nums whitespace-nowrap">
                      {row.crowCoinPrice != null && row.missing > 0 && (
                        <p className="text-xs text-amber-500/70">
                          🪙 {row.crowCoinPrice.toLocaleString()} × {row.missing}
                        </p>
                      )}
                      {row.crowCoinPrice != null && row.missing > 0 && (
                        <p className="text-sm font-semibold text-amber-400">
                          = {(row.crowCoinPrice * row.missing).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
