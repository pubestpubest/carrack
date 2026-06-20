'use client'

import { useState, useTransition } from 'react'

type Item = {
  item_id:         number
  name:            string
  name_th:         string | null
  grade:           string
  category:        string
  tier:            number
  image_url:       string | null
  crow_coin_price: number | null
}

const GRADES    = ['white', 'green', 'blue', 'yellow', 'orange', 'red']
const CATEGORIES = ['equipment', 'material', 'stone', 'license', 'currency']

const GRADE_COLOR: Record<string, string> = {
  white: '#d0cfc8', green: '#4ade80', blue: '#7dc4f0',
  yellow: '#fbbf24', orange: '#fb923c', red: '#f87171',
}

export default function AdminTable({ items: initialItems }: { items: Item[] }) {
  const [items, setItems]     = useState(initialItems)
  const [search, setSearch]   = useState('')
  const [catFilter, setCat]   = useState('')
  const [editing, setEditing] = useState<Record<number, Partial<Item>>>({})
  const [saved,   setSaved]   = useState<Record<number, boolean>>({})
  const [, startTransition]   = useTransition()

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return (
      (!search    || i.name.toLowerCase().includes(q) || (i.name_th ?? '').includes(search)) &&
      (!catFilter || i.category === catFilter)
    )
  })

  function patch(itemId: number, key: keyof Item, value: unknown) {
    setEditing(prev => ({ ...prev, [itemId]: { ...prev[itemId], [key]: value } }))
  }

  function get<K extends keyof Item>(item: Item, key: K): Item[K] {
    return (editing[item.item_id]?.[key] ?? item[key]) as Item[K]
  }

  function save(itemId: number) {
    const changes = editing[itemId]
    if (!changes || Object.keys(changes).length === 0) return
    startTransition(async () => {
      const res = await fetch(`/api/admin/item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.item_id === itemId ? { ...i, ...changes } : i))
        setEditing(prev => { const n = { ...prev }; delete n[itemId]; return n })
        setSaved(prev => ({ ...prev, [itemId]: true }))
        setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[itemId]; return n }), 1500)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm outline-none focus:border-rose-800 placeholder:text-gray-600"
        />
        <select
          value={catFilter}
          onChange={e => setCat(e.target.value)}
          className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-gray-400"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="flex items-center text-xs text-gray-600">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/80 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-2.5 w-14">Image</th>
              <th className="px-3 py-2.5">Name (EN)</th>
              <th className="px-3 py-2.5">Name (TH)</th>
              <th className="px-3 py-2.5 w-28">Grade</th>
              <th className="px-3 py-2.5 w-28">Category</th>
              <th className="px-3 py-2.5 w-16">Tier</th>
              <th className="px-3 py-2.5 w-24">🪙 Price</th>
              <th className="px-3 py-2.5">Image URL</th>
              <th className="px-3 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 bg-gray-950">
            {filtered.map(item => {
              const hasChanges = !!editing[item.item_id] && Object.keys(editing[item.item_id]).length > 0
              const isSaved    = saved[item.item_id]
              const grade      = get(item, 'grade')
              const imageUrl   = get(item, 'image_url')

              return (
                <tr key={item.item_id} className={`transition-colors ${hasChanges ? 'bg-rose-950/10' : 'hover:bg-gray-900/60'}`}>
                  {/* Image preview */}
                  <td className="px-3 py-2">
                    <div className="h-10 w-10 rounded overflow-hidden border border-gray-700 bg-gray-800">
                      {imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="" className="h-full w-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      )}
                    </div>
                  </td>

                  {/* EN name (read-only) */}
                  <td className="px-3 py-2 text-gray-300 text-xs">{item.name}</td>

                  {/* TH name */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={get(item, 'name_th') ?? ''}
                      onChange={e => patch(item.item_id, 'name_th', e.target.value || null)}
                      className="w-full rounded bg-transparent px-1.5 py-1 text-xs text-gray-200 border border-transparent focus:border-gray-700 focus:bg-gray-900 outline-none font-thai"
                    />
                  </td>

                  {/* Grade */}
                  <td className="px-3 py-2">
                    <select
                      value={grade}
                      onChange={e => patch(item.item_id, 'grade', e.target.value)}
                      className="w-full rounded bg-gray-900 border border-gray-700 px-1.5 py-1 text-xs outline-none"
                      style={{ color: GRADE_COLOR[grade] ?? '#d0cfc8' }}
                    >
                      {GRADES.map(g => (
                        <option key={g} value={g} style={{ color: GRADE_COLOR[g] }}>{g}</option>
                      ))}
                    </select>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-2">
                    <select
                      value={get(item, 'category')}
                      onChange={e => patch(item.item_id, 'category', e.target.value)}
                      className="w-full rounded bg-gray-900 border border-gray-700 px-1.5 py-1 text-xs text-gray-300 outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>

                  {/* Tier */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={get(item, 'tier') ?? 1}
                      onChange={e => patch(item.item_id, 'tier', parseInt(e.target.value) || 1)}
                      className="w-full rounded bg-transparent px-1.5 py-1 text-xs text-gray-300 border border-transparent focus:border-gray-700 focus:bg-gray-900 outline-none"
                    />
                  </td>

                  {/* Crow coin price */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={get(item, 'crow_coin_price') ?? ''}
                      onChange={e => patch(item.item_id, 'crow_coin_price', e.target.value === '' ? null : parseInt(e.target.value))}
                      placeholder="—"
                      className="w-full rounded bg-transparent px-1.5 py-1 text-xs text-amber-400/80 border border-transparent focus:border-gray-700 focus:bg-gray-900 outline-none"
                    />
                  </td>

                  {/* Image URL */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={get(item, 'image_url') ?? ''}
                      onChange={e => patch(item.item_id, 'image_url', e.target.value || null)}
                      className="w-full rounded bg-transparent px-1.5 py-1 text-xs text-gray-500 border border-transparent focus:border-gray-700 focus:bg-gray-900 outline-none font-mono"
                    />
                  </td>

                  {/* Save */}
                  <td className="px-3 py-2 text-right">
                    {isSaved ? (
                      <span className="text-xs text-emerald-500">✓</span>
                    ) : (
                      <button
                        onClick={() => save(item.item_id)}
                        disabled={!hasChanges}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          hasChanges
                            ? 'bg-rose-900/60 text-rose-300 hover:bg-rose-800/60'
                            : 'text-gray-700 cursor-default'
                        }`}
                      >
                        Save
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
