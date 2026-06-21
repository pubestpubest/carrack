'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Item = {
  item_id:   number
  name:      string
  name_th:   string | null
  grade:     string
  category:  string
  tier:      number
  image_url: string | null
}

// One row in the active gathering session: the item + how much was gathered.
type Line = { item: Item; gained: number }

const GRADE_BG: Record<string, string> = {
  white: '#1f2937', green: '#14290d', blue: '#0c1a2e',
  yellow: '#2a1f00', orange: '#2a1000', red: '#2a0a0a',
}

export default function SessionGather() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [open,    setOpen]    = useState(false)

  const [items,    setItems]    = useState<Item[]>([])
  const [haveMap,  setHaveMap]  = useState<Map<number, number>>(new Map())
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  const [lines,   setLines]   = useState<Line[]>([])
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [authed,  setAuthed]  = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Only show for signed-in users; track login/logout live.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setAuthed(!!user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user)
      if (!session?.user) setOpen(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Lazy-load catalogue + current inventory the first time the panel opens.
  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: its }, { data: inv }] = await Promise.all([
      supabase.from('items').select('item_id, name, name_th, grade, category, tier, image_url').order('tier').order('name'),
      supabase.from('user_inventory').select('item_id, qty_have'),
    ])
    setItems((its as Item[] | null) ?? [])
    setHaveMap(new Map((inv ?? []).map(r => [r.item_id, r.qty_have])))
    setLoaded(true)
    setLoading(false)
  }, [])

  function openPanel() {
    setOpen(true)
    setError(null)
    if (!loaded && !loading) loadData()
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function closePanel() {
    setOpen(false)
  }

  // Esc to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const lineIds = useMemo(() => new Set(lines.map(l => l.item.item_id)), [lines])

  // Search results — exclude already-added items, cap to keep the list snappy.
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return items
      .filter(it =>
        !lineIds.has(it.item_id) &&
        (it.name.toLowerCase().includes(q) || (it.name_th ?? '').toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [search, items, lineIds])

  function addItem(item: Item) {
    setLines(prev => [...prev, { item, gained: 1 }])
    setSearch('')
    searchRef.current?.focus()
  }

  function setGained(itemId: number, gained: number) {
    setLines(prev => prev.map(l =>
      l.item.item_id === itemId ? { ...l, gained: Math.max(0, gained) } : l,
    ))
  }

  // Functional bump for the +/- steppers — correct even under rapid clicks.
  function bumpGained(itemId: number, by: number) {
    setLines(prev => prev.map(l =>
      l.item.item_id === itemId ? { ...l, gained: Math.max(0, l.gained + by) } : l,
    ))
  }

  function removeLine(itemId: number) {
    setLines(prev => prev.filter(l => l.item.item_id !== itemId))
  }

  function resetSession() {
    setLines([])
    setSearch('')
    setError(null)
  }

  const totalGained = lines.reduce((s, l) => s + l.gained, 0)
  const canSave     = lines.some(l => l.gained > 0) && !saving

  async function save() {
    const payload = lines.filter(l => l.gained > 0).map(l => ({ item_id: l.item.item_id, delta: l.gained }))
    if (payload.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? 'Save failed')
      }
      // Reflect new totals locally so a re-open shows correct "before" values.
      setHaveMap(prev => {
        const next = new Map(prev)
        for (const l of lines) next.set(l.item.item_id, (prev.get(l.item.item_id) ?? 0) + l.gained)
        return next
      })
      setLines([])
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || !authed) return null

  return (
    <>
      {/* Floating action button — stacked above the tutorial ? button */}
      <button
        onClick={openPanel}
        title="บันทึกของที่หาได้ (Gathering session)"
        className="group fixed bottom-16 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_4px_20px_rgba(200,168,75,0.35)] transition-transform hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #c8a84b 0%, #9a7d34 100%)',
          border: '1px solid rgba(226,201,126,0.6)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#060a12" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {/* basket / haul icon */}
          <path d="M5 11h14l-1.2 8.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 11Z" />
          <path d="M9 11 12 4l3 7" />
          <path d="M3 11h18" />
        </svg>
        {lines.length > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-brass-light ring-1 ring-[rgba(226,201,126,0.6)]">
            {lines.length}
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-stretch justify-end">
          {/* Scrim */}
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" onClick={closePanel} />

          {/* Drawer */}
          <div
            className="relative flex h-full w-full max-w-md flex-col border-l shadow-2xl"
            style={{ backgroundColor: 'var(--ink-navy)', borderColor: 'var(--brass-dim)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--brass-dim)' }}>
              <div>
                <p className="text-[10px] font-display uppercase tracking-[0.25em] text-brass/60">Gathering Session</p>
                <h2 className="font-display text-lg font-semibold tracking-wider text-brass-light">บันทึกของที่หาได้</h2>
                <p className="mt-0.5 text-xs text-[#7a8699] font-thai">เพิ่มไอเทมที่เก็บมารอบนี้ ปรับจำนวน แล้วกดบันทึก</p>
              </div>
              <button
                onClick={closePanel}
                className="shrink-0 rounded-lg border border-gray-700/70 px-2.5 py-1 text-sm text-gray-400 hover:border-gray-600 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Search / add */}
            <div className="relative border-b px-5 py-3" style={{ borderColor: 'var(--brass-dim)' }}>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={loading ? 'กำลังโหลดไอเทม…' : 'ค้นหาไอเทมที่หาได้…'}
                disabled={loading}
                className="w-full rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-2.5 text-sm outline-none placeholder:text-gray-600 focus:border-brass-dim"
              />
              {results.length > 0 && (
                <div className="absolute left-5 right-5 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 shadow-xl">
                  {results.map(it => (
                    <button
                      key={it.item_id}
                      onClick={() => addItem(it)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-800/70"
                    >
                      <div
                        className={`h-9 w-9 shrink-0 overflow-hidden rounded-md border grade-frame-${it.grade}`}
                        style={{ backgroundColor: GRADE_BG[it.grade] ?? '#1f2937' }}
                      >
                        {it.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-thai grade-${it.grade}`}>{it.name_th ?? it.name}</p>
                        <p className="truncate text-xs text-gray-600">{it.name}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-600">มี {haveMap.get(it.item_id) ?? 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Session lines */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 text-4xl opacity-30">🧺</div>
                  <p className="text-sm text-gray-500 font-thai">ยังไม่มีไอเทมในรอบนี้</p>
                  <p className="mt-1 text-xs text-gray-600 font-thai">ค้นหาด้านบนเพื่อเพิ่มของที่เพิ่งหามาได้</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lines.map(({ item, gained }) => {
                    const before = haveMap.get(item.item_id) ?? 0
                    const after  = before + gained
                    return (
                      <div
                        key={item.item_id}
                        className="rounded-xl border border-gray-800 bg-gray-900/60 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg border grade-frame-${item.grade}`}
                            style={{ backgroundColor: GRADE_BG[item.grade] ?? '#1f2937' }}
                          >
                            {item.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium font-thai grade-${item.grade}`}>{item.name_th ?? item.name}</p>
                            <p className="truncate text-xs text-gray-600">{item.name}</p>
                          </div>
                          <button
                            onClick={() => removeLine(item.item_id)}
                            className="shrink-0 rounded-md p-1 text-gray-600 hover:bg-red-950/40 hover:text-red-400"
                            title="ลบออก"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          {/* Before → After */}
                          <div className="flex items-center gap-2 text-sm tabular-nums">
                            <span className="text-gray-500">{before}</span>
                            <span className="text-gray-600">→</span>
                            <span className="font-semibold text-green-400">{after}</span>
                            <span className="text-xs text-green-600/80">(+{gained})</span>
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => bumpGained(item.item_id, -1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={gained}
                              onChange={e => setGained(item.item_id, parseInt(e.target.value) || 0)}
                              className="w-14 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-center text-sm tabular-nums outline-none focus:border-brass-dim"
                            />
                            <button
                              onClick={() => bumpGained(item.item_id, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-4" style={{ borderColor: 'var(--brass-dim)' }}>
              {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
              <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                <span className="font-thai">{lines.length} ไอเทม · รวม +{totalGained}</span>
                {lines.length > 0 && (
                  <button onClick={resetSession} className="text-gray-600 hover:text-gray-400 font-thai">ล้างทั้งหมด</button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closePanel}
                  className="flex-1 rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-400 hover:border-gray-600 hover:text-gray-200 font-thai"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={save}
                  disabled={!canSave}
                  className="flex-[2] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#060a12] transition-all disabled:cursor-not-allowed disabled:opacity-40 font-thai"
                  style={{ background: 'linear-gradient(135deg, #c8a84b 0%, #9a7d34 100%)' }}
                >
                  {saving ? 'กำลังบันทึก…' : `บันทึก (${lines.filter(l => l.gained > 0).length})`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
