import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database'

const GRADE_PLACEHOLDER: Record<string, string> = {
  white:  '#1f2937', green:  '#14290d', blue:   '#0c1a2e',
  yellow: '#2a1f00', orange: '#2a1000', red:    '#2a0a0a',
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: recipes }, { data: methods }, { data: enhancements }] =
    await Promise.all([
      supabase.from('items').select('item_id, name, name_th, grade, category, tier, image_url, crow_coin_price').eq('item_id', parseInt(id)).single(),
      supabase.from('recipes').select('recipe_id, name, type, location, output_qty').eq('output_item_id', parseInt(id)),
      supabase.from('acquisition_methods').select('method_id, type, source, currency, cost, yield_per_action').eq('item_id', parseInt(id)),
      supabase.from('enhancements').select('id, level_from, level_to, result_item_id, stone_item_id').eq('base_item_id', parseInt(id)),
    ])

  if (!item) notFound()

  const typedItem = item as Tables<'items'> & { crow_coin_price: number | null }

  const recipeIds = (recipes ?? []).map(r => r.recipe_id)
  const { data: ingredients } = recipeIds.length > 0
    ? await supabase.from('recipe_ingredients').select('recipe_id, item_id, qty').in('recipe_id', recipeIds)
    : { data: [] }

  const relatedItemIds = [
    ...(ingredients ?? []).map(i => i.item_id),
    ...(enhancements ?? []).map(e => e.result_item_id),
    ...(enhancements ?? []).flatMap(e => e.stone_item_id ? [e.stone_item_id] : []),
  ]
  const { data: relatedItems } = relatedItemIds.length > 0
    ? await supabase.from('items').select('item_id, name, name_th, grade, image_url').in('item_id', relatedItemIds)
    : { data: [] }

  const relatedMap = new Map((relatedItems ?? []).map(i => [i.item_id, i]))
  const recipe = (recipes ?? [])[0] ?? null

  const grade       = typedItem.grade ?? 'white'
  const placeholder = GRADE_PLACEHOLDER[grade] ?? '#1f2937'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/catalogue" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        ← Catalogue
      </Link>

      {/* Hero card */}
      <div className={`mb-6 overflow-hidden rounded-2xl border grade-frame-${grade}`}
           style={{ backgroundColor: placeholder }}>
        <div className="flex gap-6 p-6">
          {/* Image */}
          <div className={`shrink-0 h-28 w-28 rounded-xl overflow-hidden border grade-frame-${grade}`}
               style={{ backgroundColor: placeholder }}>
            {typedItem.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={typedItem.image_url} alt={typedItem.name} className="h-full w-full object-cover" />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className={`text-2xl font-bold font-thai leading-snug grade-${grade}`}>
              {typedItem.name_th ?? typedItem.name}
            </p>
            <p className="mt-0.5 text-base text-gray-400">{typedItem.name}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold grade-${grade} grade-frame-${grade}`}>
                {grade}
              </span>
              <span className="rounded-full border border-gray-700 px-3 py-0.5 text-xs text-gray-400 capitalize">
                {typedItem.category}
              </span>
              <span className="rounded-full border border-gray-700 px-3 py-0.5 text-xs text-gray-400">
                Tier {typedItem.tier}
              </span>
              {typedItem.crow_coin_price != null && (
                <span className="rounded-full border border-amber-800/50 bg-amber-950/30 px-3 py-0.5 text-xs text-amber-400">
                  🪙 {typedItem.crow_coin_price.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe */}
      {recipe && (
        <section className="mb-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Recipe
            {recipe.location && <span className="ml-2 normal-case text-gray-600">@ {recipe.location}</span>}
            {recipe.output_qty > 1 && <span className="ml-2 normal-case text-gray-600">→ ×{recipe.output_qty}</span>}
          </h2>
          <div className="space-y-2">
            {(ingredients ?? [])
              .filter(ing => ing.recipe_id === recipe.recipe_id)
              .map(ing => {
                const ingItem = relatedMap.get(ing.item_id)
                return (
                  <Link
                    key={ing.item_id}
                    href={`/catalogue/${ing.item_id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-800/60 transition-colors"
                  >
                    {/* Ingredient image */}
                    <div
                      className={`shrink-0 h-10 w-10 rounded-lg overflow-hidden border grade-frame-${ingItem?.grade ?? 'white'}`}
                      style={{ backgroundColor: GRADE_PLACEHOLDER[ingItem?.grade ?? 'white'] ?? '#1f2937' }}
                    >
                      {ingItem?.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ingItem.image_url} alt={ingItem.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium font-thai grade-${ingItem?.grade ?? 'white'} leading-snug`}>
                        {ingItem?.name_th ?? ingItem?.name ?? `Item #${ing.item_id}`}
                      </p>
                      <p className="text-xs text-gray-600 leading-snug">{ingItem?.name}</p>
                    </div>
                    <span className="shrink-0 tabular-nums text-sm text-gray-400">×{ing.qty.toLocaleString()}</span>
                  </Link>
                )
              })}
          </div>
        </section>
      )}

      {/* Acquisition methods */}
      {(methods ?? []).length > 0 && (
        <section className="mb-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">How to obtain</h2>
          <div className="space-y-2">
            {(methods as Tables<'acquisition_methods'>[]).map(m => (
              <div key={m.method_id} className="flex items-start justify-between gap-4 rounded-xl px-3 py-2 hover:bg-gray-800/60 text-sm">
                <div>
                  <span className="font-medium capitalize text-gray-300">{m.type}</span>
                  {m.source && <span className="ml-2 text-gray-500">{m.source}</span>}
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500">
                  {m.cost != null && m.currency && <span>{m.cost.toLocaleString()} {m.currency}</span>}
                  {m.yield_per_action != null && <span className="ml-2">×{m.yield_per_action}/action</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Enhancement paths */}
      {(enhancements ?? []).length > 0 && (
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Enhancement paths</h2>
          <div className="space-y-2">
            {(enhancements as Tables<'enhancements'>[]).map(e => {
              const result = relatedMap.get(e.result_item_id)
              const stone  = e.stone_item_id ? relatedMap.get(e.stone_item_id) : null
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-800/60 text-sm">
                  <span className="shrink-0 text-xs text-gray-600">+{e.level_from} → +{e.level_to}</span>
                  <Link href={`/catalogue/${e.result_item_id}`} className={`hover:underline grade-${result?.grade ?? 'white'}`}>
                    {result?.name_th ?? result?.name ?? `Item #${e.result_item_id}`}
                  </Link>
                  {stone && <span className="text-xs text-gray-600">via {stone.name}</span>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!recipe && (methods ?? []).length === 0 && (enhancements ?? []).length === 0 && (
        <p className="text-sm text-gray-500">No recipe or acquisition data yet.</p>
      )}
    </div>
  )
}
