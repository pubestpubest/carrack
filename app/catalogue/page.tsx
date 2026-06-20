import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database'
import Link from 'next/link'

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; grade?: string; q?: string }>
}) {
  const { category, grade, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('items')
    .select('item_id, name, name_th, grade, category, tier, image_url, crow_coin_price')
    .order('tier', { ascending: true })
    .order('name', { ascending: true })

  if (category) query = query.eq('category', category)
  if (grade)    query = query.eq('grade', grade)
  if (q)        query = query.ilike('name', `%${q}%`)

  const { data: items } = await query

  const grouped: Record<string, Tables<'items'>[]> = {}
  for (const item of items ?? []) {
    ;(grouped[item.category] ??= []).push(item)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold">Catalogue</h1>

      <form className="mb-8 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Search…" className="flex-1 rounded border border-gray-700 bg-gray-800 px-4 py-2.5 text-base" />
        <select name="category" defaultValue={category ?? ''} className="rounded border border-gray-700 bg-gray-800 px-4 py-2.5 text-base">
          <option value="">All categories</option>
          {['equipment','material','stone','license','currency'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="grade" defaultValue={grade ?? ''} className="rounded border border-gray-700 bg-gray-800 px-4 py-2.5 text-base">
          <option value="">All grades</option>
          {['white','green','blue'].map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button type="submit" className="rounded bg-gray-700 px-4 py-2.5 text-base hover:bg-gray-600">Filter</button>
        <Link href="/catalogue" className="rounded border border-gray-700 px-4 py-2.5 text-base hover:border-gray-500">Reset</Link>
      </form>

      {Object.entries(grouped).map(([cat, catItems]) => (
        <section key={cat} className="mb-10">
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-gray-500 capitalize">
            {cat} ({catItems.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catItems.map(item => {
              const placeholderBg: Record<string, string> = { white: '#1f2937', green: '#14290d', blue: '#0c1a2e', yellow: '#2a1f00', orange: '#2a1000', red: '#2a0a0a' }
              return (
                <Link
                  key={item.item_id}
                  href={`/catalogue/${item.item_id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 hover:border-gray-500"
                >
                  {/* Image / placeholder */}
                  <div
                    className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border grade-frame-${item.grade}`}
                    style={{ backgroundColor: placeholderBg[item.grade] ?? '#1f2937' }}
                  >
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  {/* Names + price */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-base font-medium grade-${item.grade} leading-snug`}>{item.name_th ?? item.name}</p>
                    <p className="text-sm text-gray-500 leading-snug">{item.name}</p>
                    {item.crow_coin_price != null && (
                      <p className="text-xs text-amber-500/60 leading-snug">🪙 {item.crow_coin_price.toLocaleString()}</p>
                    )}
                  </div>
                  <span className="ml-1 shrink-0 text-sm text-gray-600">T{item.tier}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      {(items ?? []).length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500">No items found.</p>
      )}
    </div>
  )
}
