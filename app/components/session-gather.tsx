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
  crow_coin_price: number | null
}

// One row in the active gathering session: the item + how much was gathered.
// `confidence` is set when the row came from a screenshot scan.
type Line = { item: Item; gained: number; confidence?: number }

type ScanCandidate = { item_id: number; qty: number; confidence: number }

const GRADE_BG: Record<string, string> = {
  white: '#1f2937', green: '#14290d', blue: '#0c1a2e',
  yellow: '#2a1f00', orange: '#2a1000', red: '#2a0a0a',
}

// barter=true: barter-only catalogue + Input/Output toggle (Output removes from inventory).
export default function SessionGather({ barter = false }: { barter?: boolean }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [out,     setOut]     = useState(false) // barter only: Output = loaded onto ship / bartered away
  const sign = barter && out ? -1 : 1

  const [items,    setItems]    = useState<Item[]>([])
  const [haveMap,  setHaveMap]  = useState<Map<number, number>>(new Map())
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  const [lines,   setLines]   = useState<Line[]>([])
  const [search,  setSearch]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [authed,   setAuthed]   = useState(false)
  // Post-save confirmation toast: how much was recorded + its Crow Coin value.
  const [toast,    setToast]    = useState<{ qty: number; coins: number; out: boolean } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanNote, setScanNote] = useState<string | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null) // object URL, session-only
  const [showFull,    setShowFull]    = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const scanUrlRef = useRef<string | null>(null)

  // Swap the preview object URL, revoking the previous one to avoid leaks.
  function setPreview(url: string | null) {
    if (scanUrlRef.current) URL.revokeObjectURL(scanUrlRef.current)
    scanUrlRef.current = url
    setScanPreview(url)
  }
  useEffect(() => () => { if (scanUrlRef.current) URL.revokeObjectURL(scanUrlRef.current) }, [])

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
    const itemsQ = supabase.from('items').select('item_id, name, name_th, grade, category, tier, image_url, crow_coin_price').order('tier').order('name')
    const [{ data: its }, { data: inv }] = await Promise.all([
      barter ? itemsQ.eq('category', 'barter') : itemsQ,
      supabase.from('user_inventory').select('item_id, qty_have'),
    ])
    const list = (its as Item[] | null) ?? []
    setItems(list)
    setHaveMap(new Map((inv ?? []).map(r => [r.item_id, r.qty_have])))
    setLoaded(true)
    setLoading(false)
    return list
  }, [barter])

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

  // Auto-dismiss the save toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

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

  // Merge scanned candidates into the session lines (summing qty for repeats).
  function mergeScanned(cands: ScanCandidate[], skipped: number, list: Item[]) {
    let dropped = 0 // matched items not in the (barter-filtered) catalogue
    setLines(prev => {
      const map = new Map(prev.map(l => [l.item.item_id, { ...l }]))
      for (const c of cands) {
        const item = list.find(i => i.item_id === c.item_id)
        if (!item) { dropped++; continue }
        const ex = map.get(c.item_id)
        if (ex) ex.gained += c.qty
        else map.set(c.item_id, { item, gained: c.qty, confidence: c.confidence })
      }
      return [...map.values()]
    })
    const miss = skipped + dropped
    setScanNote(miss > 0 ? `ข้าม ${miss} ไอเทมที่ระบบไม่รู้จัก` : null)
  }

  async function onScanFile(file: File | undefined) {
    if (!file) return
    setScanning(true); setError(null); setScanNote(null)
    setPreview(URL.createObjectURL(file)) // show what's being scanned
    try {
      const list = loaded ? items : await loadData()
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/inventory/session/scan', { method: 'POST', body: fd })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error ?? 'สแกนภาพไม่สำเร็จ')
      const cands: ScanCandidate[] = j?.candidates ?? []
      if (cands.length === 0 && (j?.skipped ?? 0) === 0) {
        setScanNote('ไม่พบไอเทมในภาพ ลองถ่าย/ครอบให้ตรงช่องเก็บของ')
      } else {
        mergeScanned(cands, j?.skipped ?? 0, list)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สแกนภาพไม่สำเร็จ')
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
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
    setScanNote(null)
    setShowFull(false)
    setPreview(null)
  }

  const totalGained = lines.reduce((s, l) => s + l.gained, 0)
  const canSave     = lines.some(l => l.gained > 0) && !saving

  async function save() {
    const saved   = lines.filter(l => l.gained > 0)
    const payload = saved.map(l => ({ item_id: l.item.item_id, delta: sign * l.gained }))
    if (payload.length === 0) return
    // Totals for the post-save toast: pieces recorded + their Crow Coin value.
    const savedQty   = saved.reduce((s, l) => s + l.gained, 0)
    const savedCoins = saved.reduce((s, l) => s + (l.item.crow_coin_price ?? 0) * l.gained, 0)
    const reason = barter ? (out ? 'barter out' : 'barter in') : 'gathering session'
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload, reason }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? 'Save failed')
      }
      // Reflect new totals locally so a re-open shows correct "before" values.
      setHaveMap(prev => {
        const next = new Map(prev)
        for (const l of lines) next.set(l.item.item_id, Math.max(0, (prev.get(l.item.item_id) ?? 0) + sign * l.gained))
        return next
      })
      setLines([])
      setOpen(false)
      setToast({ qty: savedQty, coins: savedCoins, out: sign < 0 })
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
      {/* Floating action button — barter stacks above the gathering button */}
      <button
        onClick={openPanel}
        data-tour={barter ? 'session-barter' : 'session-gather'}
        title={barter ? 'บันทึกบาร์เตอร์ เข้า/ออก (Barter session)' : 'บันทึกของที่หาได้ (Gathering session)'}
        className={`group fixed ${barter ? 'bottom-32' : 'bottom-16'} right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95`}
        style={barter ? {
          background: 'linear-gradient(135deg, #4a9da8 0%, #2f6e78 100%)',
          border: '1px solid rgba(140,210,220,0.6)',
          boxShadow: '0 4px 20px rgba(74,157,168,0.35)',
        } : {
          background: 'linear-gradient(135deg, #c8a84b 0%, #9a7d34 100%)',
          border: '1px solid rgba(226,201,126,0.6)',
          boxShadow: '0 4px 20px rgba(200,168,75,0.35)',
        }}
      >
        {barter ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#060a12" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {/* exchange / barter arrows */}
            <path d="M7 4 3 8l4 4" />
            <path d="M3 8h14" />
            <path d="m17 20 4-4-4-4" />
            <path d="M21 16H7" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#060a12" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {/* basket / haul icon */}
            <path d="M5 11h14l-1.2 8.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 11Z" />
            <path d="M9 11 12 4l3 7" />
            <path d="M3 11h18" />
          </svg>
        )}
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
                <p className="text-[10px] font-display uppercase tracking-[0.25em] text-brass/60">{barter ? 'Barter Session' : 'Gathering Session'}</p>
                <h2 className="font-display text-lg font-semibold tracking-wider text-brass-light">{barter ? 'บันทึกบาร์เตอร์' : 'บันทึกของที่หาได้'}</h2>
                <p className="mt-0.5 text-xs text-[#7a8699] font-thai">{barter ? 'เลือกโหมดเข้า/ออก เพิ่มไอเทมบาร์เตอร์ แล้วกดบันทึก' : 'เพิ่มไอเทมที่เก็บมารอบนี้ ปรับจำนวน แล้วกดบันทึก'}</p>
              </div>
              <button
                onClick={closePanel}
                className="shrink-0 rounded-lg border border-gray-700/70 px-2.5 py-1 text-sm text-gray-400 hover:border-gray-600 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Input/Output mode toggle — barter only. Output removes from inventory. */}
            {barter && (
              <div className="flex gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--brass-dim)' }}>
                <button
                  onClick={() => setOut(false)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold font-thai transition-colors ${!out ? 'border-green-500/60 bg-green-950/40 text-green-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
                >
                  ↓ เข้า (ได้รับ)
                </button>
                <button
                  onClick={() => setOut(true)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold font-thai transition-colors ${out ? 'border-amber-500/60 bg-amber-950/40 text-amber-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
                >
                  ↑ ออก (ใช้/ขาย)
                </button>
              </div>
            )}

            {/* Search / add */}
            <div className="relative border-b px-5 py-3" style={{ borderColor: 'var(--brass-dim)' }}>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={loading ? 'กำลังโหลดไอเทม…' : (barter ? 'ค้นหาไอเทมบาร์เตอร์…' : 'ค้นหาไอเทมที่หาได้…')}
                disabled={loading}
                className="w-full rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-2.5 text-sm outline-none placeholder:text-gray-600 focus:border-brass-dim"
              />
              {/* Scan-from-screenshot */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => onScanFile(e.target.files?.[0] ?? undefined)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={scanning}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2 text-xs font-semibold font-thai transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--brass-dim)', color: 'var(--brass-light)' }}
              >
                {scanning ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brass-dim border-t-transparent" />
                    กำลังอ่านภาพ…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                    สแกนจากภาพหน้าจอคลัง
                  </>
                )}
              </button>
              {scanNote && (
                <p className="mt-2 text-[11px] text-amber-500/80 font-thai">{scanNote}</p>
              )}

              {/* Uploaded image preview — verify the scan against the source */}
              {scanPreview && (
                <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-gray-800 bg-gray-900/50 p-2">
                  <button
                    onClick={() => setShowFull(true)}
                    className="relative shrink-0 overflow-hidden rounded-lg border border-gray-700 transition-transform hover:scale-[1.03]"
                    title="ดูภาพเต็ม"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scanPreview} alt="ภาพที่สแกน" className="h-14 w-14 object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 transition-opacity hover:opacity-100">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7" /></svg>
                    </span>
                  </button>
                  <p className="flex-1 text-[11px] leading-snug text-gray-500 font-thai">
                    ภาพที่สแกน — แตะเพื่อดูเต็ม แล้วเทียบกับรายการด้านล่าง
                  </p>
                  <button
                    onClick={() => setPreview(null)}
                    className="shrink-0 rounded-md p-1 text-gray-600 hover:bg-gray-800 hover:text-gray-300"
                    title="ซ่อนภาพ"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

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
                  {lines.map(({ item, gained, confidence }) => {
                    const before = haveMap.get(item.item_id) ?? 0
                    const after  = Math.max(0, before + sign * gained)
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
                            <div className="flex items-center gap-1.5">
                              <p className={`truncate text-sm font-medium font-thai grade-${item.grade}`}>{item.name_th ?? item.name}</p>
                              {confidence != null && (
                                <span className="shrink-0 rounded bg-brass-glow px-1 text-[9px] font-semibold text-brass-light" title="มาจากการสแกนภาพ">
                                  สแกน {Math.round(confidence * 100)}%
                                </span>
                              )}
                            </div>
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
                            <span className={`font-semibold ${sign < 0 ? 'text-amber-400' : 'text-green-400'}`}>{after}</span>
                            <span className={`text-xs ${sign < 0 ? 'text-amber-600/80' : 'text-green-600/80'}`}>({sign < 0 ? '−' : '+'}{gained})</span>
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
                <span className="font-thai">{lines.length} ไอเทม · รวม {sign < 0 ? '−' : '+'}{totalGained}</span>
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

          {/* Full-image lightbox */}
          {showFull && scanPreview && (
            <div
              className="absolute inset-0 z-[10002] flex items-center justify-center bg-black/85 p-6"
              onClick={() => setShowFull(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={scanPreview} alt="ภาพที่สแกน" className="max-h-full max-w-full rounded-lg shadow-2xl" />
              <button
                onClick={() => setShowFull(false)}
                className="absolute right-4 top-4 rounded-lg border border-gray-600 bg-black/50 px-3 py-1.5 text-sm text-gray-200 hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}

      {toast && createPortal(
        <div className="animate-hero-rise fixed bottom-6 left-1/2 z-[10050] -translate-x-1/2 px-4">
          <div
            className="flex items-center gap-3 rounded-2xl border px-5 py-3.5"
            style={{
              background: 'linear-gradient(135deg, var(--ink-surface) 0%, rgba(8,13,22,0.97) 100%)',
              borderColor: 'rgba(200,168,75,0.35)',
              boxShadow: '0 14px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(200,168,75,0.1)',
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold"
              style={toast.out
                ? { background: 'rgba(251,191,36,0.14)', color: '#fbbf24', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,0.4)' }
                : { background: 'rgba(74,222,128,0.14)', color: '#4ade80', boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.4)' }}
            >
              ✓
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide text-brass-light">
                บันทึกแล้ว · <span className="font-thai">{toast.out ? 'นำออก' : 'เพิ่ม'} {toast.qty.toLocaleString()} ชิ้น</span>
              </p>
              <p className="mt-0.5 text-xs font-thai tabular-nums text-amber-500/80">
                {toast.coins > 0
                  ? `🪙 เทียบเท่า ~${toast.coins.toLocaleString()} อีกาคอยน์`
                  : 'ไม่มีมูลค่าอีกาคอยน์'}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-1 shrink-0 rounded-md p-1 text-gray-600 hover:text-gray-300"
              aria-label="ปิด"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
