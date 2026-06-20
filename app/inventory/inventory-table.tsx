'use client'

import { useState, useTransition } from 'react'

type ItemRow = {
  item_id:         number
  name:            string
  name_th:         string | null
  grade:           string
  category:        string
  tier:            number
  image_url:       string | null
  crow_coin_price: number | null
  qty_have:        number
}

const GRADE_PLACEHOLDER: Record<string, string> = {
  white:  '#1f2937',
  green:  '#14290d',
  blue:   '#0c1a2e',
  yellow: '#2a1f00',
  orange: '#2a1000',
  red:    '#2a0a0a',
}

const CATEGORY_ORDER   = ['equipment', 'material', 'stone', 'license'] as const
const CATEGORY_LABEL: Record<string, string> = {
  equipment: 'Ship Equipment',
  material:  'Materials',
  stone:     'Enhancement Stones',
  license:   'Licenses',
  currency:  'Currency',
}
// lg = 2-col grid. Equipment & material full-width; stone+license side-by-side; currency full-width
const CATEGORY_SPAN: Record<string, string> = {
  equipment: 'lg:col-span-2',
  material:  'lg:col-span-2',
  stone:     'lg:col-span-1',
  license:   'lg:col-span-1',
  currency:  'lg:col-span-2',
}
// Wide categories use multi-column item layout inside the card
const INNER_GRID: Record<string, string> = {
  equipment: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4',
  material:  'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4',
  stone:     'grid grid-cols-1 gap-x-4',
  license:   'grid grid-cols-1 gap-x-4',
  currency:  'grid grid-cols-1 md:grid-cols-2 gap-x-4',
}

const CATEGORIES = ['equipment', 'material', 'stone', 'license']

export default function InventoryBento({ items }: { items: ItemRow[] }) {
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState('')
  const [editing,   setEditing]   = useState<Record<number, string>>({})
  const [saved,     setSaved]     = useState<Record<number, number>>({})
  const [flash,     setFlash]     = useState<Record<number, boolean>>({})
  const [, startTransition] = useTransition()

  const getQty = (item: ItemRow) => {
    if (editing[item.item_id] !== undefined) return editing[item.item_id]
    if (saved[item.item_id]   !== undefined) return String(saved[item.item_id])
    return String(item.qty_have)
  }

  const getActualQty = (item: ItemRow) =>
    saved[item.item_id] ?? item.qty_have

  const crowCoinItem  = items.find(i => i.name === 'Crow Coin')
  const itemsInStock  = items.filter(i => getActualQty(i) > 0).length
  const totalTracked  = items.length
  const totalQuantity = items.reduce((sum, i) => sum + getActualQty(i), 0)

  const filtered = items.filter(item => {
    const q = search.toLowerCase()
    return (
      (!search   || item.name.toLowerCase().includes(q) || (item.name_th ?? '').includes(search)) &&
      (!category || item.category === category)
    )
  })

  const grouped: Record<string, ItemRow[]> = Object.fromEntries(CATEGORY_ORDER.map(c => [c, []]))
  for (const item of filtered) {
    if (grouped[item.category]) grouped[item.category].push(item)
  }

  function handleChange(itemId: number, value: string) {
    setEditing(prev => ({ ...prev, [itemId]: value }))
  }

  async function handleBlur(itemId: number) {
    const raw = editing[itemId]
    if (raw === undefined) return
    const qty = Math.max(0, parseInt(raw) || 0)
    const current = saved[itemId] ?? items.find(i => i.item_id === itemId)?.qty_have ?? 0
    setEditing(prev => { const n = { ...prev }; delete n[itemId]; return n })
    if (qty === current) return

    startTransition(async () => {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty }),
      })
      if (res.ok) {
        setSaved(prev => ({ ...prev, [itemId]: qty }))
        setFlash(prev => ({ ...prev, [itemId]: true }))
        setTimeout(() => setFlash(prev => { const n = { ...prev }; delete n[itemId]; return n }), 1200)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Item Types" value={totalTracked} sub="in catalogue" />
        <StatCard label="In Stock"   value={itemsInStock} sub={`of ${totalTracked}`} accent />
        <StatCard label="Total Qty"  value={totalQuantity.toLocaleString()} sub="across all items" />
        {crowCoinItem && (
          <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-5 flex items-center gap-3">
            {crowCoinItem.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={crowCoinItem.image_url} alt="Crow Coin" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-amber-600/80 mb-1 font-thai">{crowCoinItem.name_th ?? 'Crow Coin'}</p>
              <input
                type="number"
                min={0}
                value={getQty(crowCoinItem)}
                onChange={e => handleChange(crowCoinItem.item_id, e.target.value)}
                onBlur={() => handleBlur(crowCoinItem.item_id)}
                className={`w-full rounded-lg border px-2 py-1 text-right text-lg font-bold tabular-nums transition-colors focus:outline-none ${
                  flash[crowCoinItem.item_id]
                    ? 'border-green-600 bg-green-950 text-green-400'
                    : getActualQty(crowCoinItem) > 0
                      ? 'border-amber-800/60 bg-amber-950/40 text-amber-300 focus:border-amber-500'
                      : 'border-gray-800 bg-transparent text-gray-500 focus:border-amber-500 focus:bg-gray-800'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-base outline-none focus:border-blue-500 placeholder:text-gray-600"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-base text-gray-300"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
        </select>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {CATEGORY_ORDER.map(cat => {
          const catItems = grouped[cat] ?? []
          if (catItems.length === 0) return null
          const span  = CATEGORY_SPAN[cat] ?? ''
          const inner = INNER_GRID[cat]    ?? ''

          return (
            <div
              key={cat}
              className={`rounded-2xl border border-gray-800 bg-gray-900 p-6 ${span}`}
            >
              {/* Card header */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-200">{CATEGORY_LABEL[cat] ?? cat}</h2>
                <span className="rounded-full bg-gray-800 px-3 py-0.5 text-sm text-gray-500">
                  {catItems.length}
                </span>
              </div>

              {/* Item list */}
              <div className={inner}>
                {[...catItems].sort((a, b) => getActualQty(b) - getActualQty(a)).map(item => {
                  const qty     = getActualQty(item)
                  const isSaved = flash[item.item_id]
                  return (
                    <div
                      key={item.item_id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-800/60"
                    >
                      {/* Image / placeholder */}
                      <div
                        className={`shrink-0 h-20 w-20 rounded-lg overflow-hidden border grade-frame-${item.grade}`}
                        style={{ backgroundColor: GRADE_PLACEHOLDER[item.grade] ?? '#1f2937' }}
                      >
                        {item.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1">
                        <p className={`text-base font-medium font-thai grade-${item.grade} leading-snug`}>{item.name_th ?? item.name}</p>
                        <p className="text-sm text-gray-600 leading-snug">{item.name}</p>
                        {item.crow_coin_price != null && (
                          <p className="text-xs text-amber-500/70 leading-snug">🪙 {item.crow_coin_price.toLocaleString()}</p>
                        )}
                      </div>

                      {/* Qty input */}
                      <div className="relative shrink-0">
                        <input
                          type="number"
                          min={0}
                          value={getQty(item)}
                          onChange={e => handleChange(item.item_id, e.target.value)}
                          onBlur={() => handleBlur(item.item_id)}
                          className={`w-16 rounded-lg border px-2 py-1.5 text-right text-base tabular-nums transition-colors focus:outline-none ${
                            isSaved
                              ? 'border-green-600 bg-green-950 text-green-400'
                              : qty > 0
                                ? 'border-gray-700 bg-gray-800 text-gray-200 focus:border-blue-500'
                                : 'border-gray-800 bg-transparent text-gray-600 focus:border-blue-500 focus:bg-gray-800'
                          }`}
                        />
                        {isSaved && (
                          <span className="pointer-events-none absolute -right-5 top-1/2 -translate-y-1/2 text-xs text-green-500">✓</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-gray-600">No items match your filter.</p>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label:   string
  value:   string | number
  sub:     string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-6 ${accent ? 'border-blue-900 bg-blue-950/40' : 'border-gray-800 bg-gray-900'}`}>
      <p className="mb-1 text-sm text-gray-500">{label}</p>
      <p className={`text-4xl font-bold tabular-nums ${accent ? 'text-blue-400' : ''}`}>{value}</p>
      <p className="mt-1 text-sm text-gray-600">{sub}</p>
    </div>
  )
}
