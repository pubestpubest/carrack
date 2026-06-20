import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database'

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: recipes }, { data: methods }, { data: enhancements }] =
    await Promise.all([
      supabase.from('items').select('item_id, name, name_th, grade, category, tier, image_url').eq('item_id', parseInt(id)).single(),
      supabase.from('recipes').select('recipe_id, name, type, location, output_qty').eq('output_item_id', parseInt(id)),
      supabase.from('acquisition_methods').select('method_id, type, source, currency, cost, yield_per_action').eq('item_id', parseInt(id)),
      supabase.from('enhancements').select('id, level_from, level_to, result_item_id, stone_item_id').eq('base_item_id', parseInt(id)),
    ])

  if (!item) notFound()

  const typedItem = item as Tables<'items'>

  // Load recipe ingredients for each recipe
  const recipeIds = (recipes ?? []).map(r => r.recipe_id)
  const { data: ingredients } = recipeIds.length > 0
    ? await supabase.from('recipe_ingredients').select('recipe_id, item_id, qty').in('recipe_id', recipeIds)
    : { data: [] }

  // Load item names for ingredients + enhancement results
  const relatedItemIds = [
    ...(ingredients ?? []).map(i => i.item_id),
    ...(enhancements ?? []).map(e => e.result_item_id),
    ...(enhancements ?? []).flatMap(e => e.stone_item_id ? [e.stone_item_id] : []),
  ]
  const { data: relatedItems } = relatedItemIds.length > 0
    ? await supabase.from('items').select('item_id, name, grade').in('item_id', relatedItemIds)
    : { data: [] }

  const relatedMap = new Map((relatedItems ?? []).map(i => [i.item_id, i]))

  const recipe = (recipes ?? [])[0] ?? null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/catalogue" className="mb-4 inline-block text-sm text-gray-400 hover:text-white">
        ← Catalogue
      </Link>

      <div className="mb-6">
        <h1 className={`text-2xl font-bold grade-${typedItem.grade}`}>{typedItem.name}</h1>
        {typedItem.name_th && <p className="text-sm text-gray-400">{typedItem.name_th}</p>}
        <div className="mt-2 flex gap-3 text-sm text-gray-500">
          <span className={`grade-${typedItem.grade}`}>{typedItem.grade}</span>
          <span>·</span>
          <span>{typedItem.category}</span>
          <span>·</span>
          <span>Tier {typedItem.tier}</span>
        </div>
      </div>

      {recipe && (
        <section className="mb-6 rounded-lg border border-gray-700 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Recipe — {recipe.type}{recipe.location ? ` @ ${recipe.location}` : ''}
          </h2>
          <div className="space-y-2">
            {(ingredients ?? [])
              .filter(ing => ing.recipe_id === recipe.recipe_id)
              .map(ing => {
                const ingItem = relatedMap.get(ing.item_id)
                return (
                  <div key={ing.item_id} className="flex items-center justify-between text-sm">
                    <Link href={`/catalogue/${ing.item_id}`} className={`hover:underline grade-${ingItem?.grade ?? 'white'}`}>
                      {ingItem?.name ?? `Item #${ing.item_id}`}
                    </Link>
                    <span className="tabular-nums text-gray-400">×{ing.qty.toLocaleString()}</span>
                  </div>
                )
              })}
          </div>
          {recipe.output_qty > 1 && (
            <p className="mt-3 text-xs text-gray-500">Produces ×{recipe.output_qty}</p>
          )}
        </section>
      )}

      {(methods ?? []).length > 0 && (
        <section className="mb-6 rounded-lg border border-gray-700 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">How to obtain</h2>
          <div className="space-y-2">
            {(methods as Tables<'acquisition_methods'>[]).map(m => (
              <div key={m.method_id} className="flex items-start justify-between gap-4 text-sm">
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

      {(enhancements ?? []).length > 0 && (
        <section className="rounded-lg border border-gray-700 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Enhancement paths</h2>
          <div className="space-y-2">
            {(enhancements as Tables<'enhancements'>[]).map(e => {
              const result = relatedMap.get(e.result_item_id)
              const stone  = e.stone_item_id ? relatedMap.get(e.stone_item_id) : null
              return (
                <div key={e.id} className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">+{e.level_from} → +{e.level_to}</span>
                  <Link href={`/catalogue/${e.result_item_id}`} className={`hover:underline grade-${result?.grade ?? 'white'}`}>
                    {result?.name ?? `Item #${e.result_item_id}`}
                  </Link>
                  {stone && <span className="text-xs text-gray-500">via {stone.name}</span>}
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
