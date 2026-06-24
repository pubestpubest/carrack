'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

export type BarterRow = {
  item_id:   number
  name:      string
  name_th:   string | null
  grade:     string
  tier:      number
  image_url: string | null
  qty_have:  number
}
export type Threshold = { tier: number; crit: number; warn: number }

type SortKey = 'id-hl' | 'id-lh' | 'qty-hl' | 'qty-lh'
const SORT_LABEL: Record<SortKey, string> = {
  'id-hl': 'In-game order (ID ↓)',
  'id-lh': 'ID: low → high',
  'qty-hl': 'Qty: high → low',
  'qty-lh': 'Qty: low → high',
}

const DEFAULT_CRIT = 10
const DEFAULT_WARN = 20

const GRADE_BG: Record<string, string> = {
  white: '#171f2b', green: '#13230d', blue: '#0b1a2e', yellow: '#241b06', orange: '#251104', red: '#260b0b',
}
const GRADE_DOT: Record<string, string> = {
  white: '#d0cfc8', green: '#4ade80', blue: '#7dc4f0', yellow: '#fbbf24', orange: '#fb923c', red: '#f87171',
}
const GRADE_NAME: Record<string, string> = {
  white: 'Common', green: 'Uncommon', blue: 'Rare', yellow: 'Choice', orange: 'Prime', red: 'Mythic',
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

type Health = 'red' | 'yellow' | 'green'
const HEALTH: Record<Health, { c: string; ring: string; soft: string }> = {
  red:    { c: '#f87171', ring: 'rgba(248,113,113,0.55)', soft: 'rgba(248,113,113,0.11)' },
  yellow: { c: '#fbbf24', ring: 'rgba(251,191,36,0.50)',  soft: 'rgba(251,191,36,0.09)'  },
  green:  { c: '#4ade80', ring: 'rgba(74,222,128,0.32)',  soft: 'rgba(74,222,128,0.06)'  },
}
const healthOf = (qty: number, t: { crit: number; warn: number }): Health =>
  qty < t.crit ? 'red' : qty < t.warn ? 'yellow' : 'green'

export default function BarterHold({ rows, thresholds }: { rows: BarterRow[]; thresholds: Threshold[] }) {
  const [search,    setSearch]    = useState('')
  const [tierSel,   setTierSel]   = useState<number | null>(null)
  const [heldOnly,  setHeldOnly]  = useState(false)
  const [showCfg,   setShowCfg]   = useState(false)
  const [sort,      setSort]      = useState<SortKey>('id-hl')

  const [editing, setEditing] = useState<Record<number, string>>({})
  const [saved,   setSaved]   = useState<Record<number, number>>({})
  const [flash,   setFlash]   = useState<Record<number, boolean>>({})

  // tier → {crit, warn}, seeded from props, edited locally
  const [tmap, setTmap] = useState<Record<number, { crit: number; warn: number }>>(
    () => Object.fromEntries(thresholds.map(t => [t.tier, { crit: t.crit, warn: t.warn }])),
  )
  const [, startTransition] = useTransition()

  const thr = (tier: number) => tmap[tier] ?? { crit: DEFAULT_CRIT, warn: DEFAULT_WARN }
  const actual = (r: BarterRow) => saved[r.item_id] ?? r.qty_have
  const input  = (r: BarterRow) => (editing[r.item_id] !== undefined ? editing[r.item_id] : String(actual(r)))

  function commitQty(itemId: number, next: number) {
    const qty = Math.max(0, Math.floor(next) || 0)
    setEditing(prev => { const n = { ...prev }; delete n[itemId]; return n })
    setSaved(prev => ({ ...prev, [itemId]: qty }))
    startTransition(async () => {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qty }),
      })
      if (res.ok) {
        setFlash(prev => ({ ...prev, [itemId]: true }))
        setTimeout(() => setFlash(prev => { const n = { ...prev }; delete n[itemId]; return n }), 1100)
      }
    })
  }

  function saveThreshold(tier: number, crit: number, warn: number) {
    const c = Math.max(0, Math.floor(crit) || 0)
    const w = Math.max(c, Math.floor(warn) || 0)
    setTmap(prev => ({ ...prev, [tier]: { crit: c, warn: w } }))
    startTransition(async () => {
      await fetch('/api/barter/thresholds', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, crit: c, warn: w }),
      })
    })
  }

  const tiers = useMemo(() => [...new Set(rows.map(r => r.tier))].sort((a, b) => a - b), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    const q = search.trim().toLowerCase()
    return (!q || r.name.toLowerCase().includes(q) || (r.name_th ?? '').includes(search.trim()))
      && (tierSel === null || r.tier === tierSel)
      && (!heldOnly || actual(r) > 0)
  }), [rows, search, tierSel, heldOnly, saved]) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const m = new Map<number, BarterRow[]>()
    for (const r of filtered) (m.get(r.tier) ?? m.set(r.tier, []).get(r.tier)!).push(r)
    // sort each shelf by the chosen key (qty ties break to in-game ID order)
    for (const list of m.values()) list.sort((a, b) => {
      switch (sort) {
        case 'id-lh':  return a.item_id - b.item_id
        case 'qty-hl': return actual(b) - actual(a) || b.item_id - a.item_id
        case 'qty-lh': return actual(a) - actual(b) || b.item_id - a.item_id
        default:       return b.item_id - a.item_id // id-hl — in-game order
      }
    })
    return m
  }, [filtered, saved, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const goodsHeld  = rows.filter(r => actual(r) > 0).length
  const totalUnits = rows.reduce((s, r) => s + actual(r), 0)
  const tiersStock = new Set(rows.filter(r => actual(r) > 0).map(r => r.tier)).size

  return (
    <div className="mx-auto max-w-7xl px-6 py-9">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header
        className="animate-hero-rise relative mb-7 overflow-hidden rounded-2xl px-7 py-6"
        style={{
          background: 'linear-gradient(135deg, var(--ink-surface) 0%, rgba(8,13,22,0.92) 100%)',
          border: '1px solid rgba(200,168,75,0.22)',
          boxShadow: '0 10px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,168,75,0.10)',
        }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,168,75,0.13), transparent 70%)' }} />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-1 font-display text-xs uppercase tracking-[0.28em]" style={{ color: 'rgba(200,168,75,0.55)' }}>
              Cargo Manifest
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-wider" style={{ color: 'var(--brass-light)' }}>
              Barter Hold
            </h1>
            <p className="mt-1.5 font-thai text-sm text-[#8a8472]">คลังสินค้าแลกเปลี่ยน · สินค้าเดินเรือสำหรับแลกข้ามท่า</p>
          </div>
          <div className="flex gap-3">
            <Stat label="Goods Held"    value={goodsHeld}                   sub={`of ${rows.length}`} accent />
            <Stat label="Total Units"   value={totalUnits.toLocaleString()} sub="in hold" />
            <Stat label="Tiers Stocked" value={`${tiersStock}/${tiers.length}`} sub="laden" />
          </div>
        </div>
      </header>

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6678]">⚓</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the manifest…"
            className="w-full rounded-xl border bg-[rgba(17,29,48,0.6)] py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[#5a6678] focus:border-[var(--brass-dim)]"
            style={{ borderColor: 'rgba(200,168,75,0.16)' }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <TierPill active={tierSel === null} onClick={() => setTierSel(null)}>All</TierPill>
          {tiers.map(t => {
            const g = rows.find(r => r.tier === t)?.grade ?? 'white'
            return (
              <TierPill key={t} active={tierSel === t} dot={GRADE_DOT[g]} onClick={() => setTierSel(tierSel === t ? null : t)}>
                {ROMAN[t] ?? t}
              </TierPill>
            )
          })}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          aria-label="Sort goods within each tier"
          className="rounded-xl border bg-[rgba(17,29,48,0.6)] px-3 py-2.5 font-display text-xs uppercase tracking-wider text-[#9fb0c4] outline-none transition-colors focus:border-[var(--brass-dim)]"
          style={{ borderColor: 'rgba(200,168,75,0.18)' }}
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
            <option key={k} value={k} className="bg-[#0b1220] tracking-normal">{SORT_LABEL[k]}</option>
          ))}
        </select>
        <button
          onClick={() => setHeldOnly(v => !v)}
          className="rounded-xl border px-3.5 py-2.5 font-display text-xs uppercase tracking-widest transition-colors"
          style={heldOnly
            ? { background: 'linear-gradient(135deg,#e2c97e,#c8a84b)', color: '#060a12', borderColor: 'transparent' }
            : { color: '#9fb0c4', borderColor: 'rgba(200,168,75,0.18)' }}
        >
          Held only
        </button>
        <button
          onClick={() => setShowCfg(v => !v)}
          className="rounded-xl border px-3.5 py-2.5 font-display text-xs uppercase tracking-widest transition-colors"
          style={showCfg
            ? { color: '#e2c97e', borderColor: 'rgba(200,168,75,0.4)', background: 'rgba(200,168,75,0.1)' }
            : { color: '#9fb0c4', borderColor: 'rgba(200,168,75,0.18)' }}
        >
          ⚙ Thresholds
        </button>
      </div>

      {/* ── Threshold editor ─────────────────────────────────────────── */}
      {showCfg && (
        <div
          className="animate-hero-rise mb-6 rounded-2xl border p-5"
          style={{ borderColor: 'rgba(200,168,75,0.18)', background: 'rgba(8,13,22,0.5)' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-display text-sm uppercase tracking-[0.18em]" style={{ color: 'var(--brass-light)' }}>Stock Health Thresholds</h3>
            <span className="text-xs text-[#5a6678]">per tier · below red = restock · below green = low</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map(t => {
              const g = rows.find(r => r.tier === t)?.grade ?? 'white'
              const cur = thr(t)
              return (
                <div key={t} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(200,168,75,0.12)' }}>
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 font-display text-xs font-bold"
                    style={{ color: GRADE_DOT[g], background: GRADE_BG[g] }}>
                    {ROMAN[t] ?? t}
                  </span>
                  <ThrField label="Red <"   color={HEALTH.red.c}   value={cur.crit} onCommit={v => saveThreshold(t, v, cur.warn)} />
                  <ThrField label="Green ≥" color={HEALTH.green.c} value={cur.warn} onCommit={v => saveThreshold(t, cur.crit, v)} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tier shelves ─────────────────────────────────────────────── */}
      <div className="space-y-8">
        {tiers.map((t, idx) => {
          const items = grouped.get(t)
          if (!items || items.length === 0) return null
          const g  = items[0].grade
          const ct = thr(t)
          const tally = { red: 0, yellow: 0, green: 0 } as Record<Health, number>
          for (const r of items) tally[healthOf(actual(r), ct)]++

          return (
            <section key={t} className="animate-hero-rise" style={{ animationDelay: `${idx * 55}ms` }}>
              {/* Shelf header */}
              <div className="mb-3.5 flex flex-wrap items-center gap-3">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-display text-sm font-bold"
                  style={{ color: GRADE_DOT[g], background: GRADE_BG[g], boxShadow: `inset 0 0 0 1px ${GRADE_DOT[g]}55` }}>
                  {ROMAN[t] ?? t}
                </span>
                <div className="leading-tight">
                  <p className="font-display text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--brass-light)' }}>Tier {ROMAN[t] ?? t}</p>
                  <p className="text-xs" style={{ color: GRADE_DOT[g] }}>{GRADE_NAME[g] ?? g}</p>
                </div>
                {/* Health tally */}
                <div className="flex items-center gap-2.5 text-xs tabular-nums">
                  <HealthChip color={HEALTH.green.c}  n={tally.green} />
                  <HealthChip color={HEALTH.yellow.c} n={tally.yellow} />
                  <HealthChip color={HEALTH.red.c}    n={tally.red} />
                </div>
                <span className="text-[11px] text-[#5a6678]">red&nbsp;&lt;&nbsp;{ct.crit} · green&nbsp;≥&nbsp;{ct.warn}</span>
                <div className="ml-auto h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,168,75,0.2))' }} />
              </div>

              {/* Crates — denser grid, native-res thumbnails */}
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {items.map(r => (
                  <Crate
                    key={r.item_id}
                    row={r}
                    qty={actual(r)}
                    health={healthOf(actual(r), ct)}
                    value={input(r)}
                    flash={!!flash[r.item_id]}
                    onEdit={v => setEditing(p => ({ ...p, [r.item_id]: v }))}
                    onBlur={() => { if (editing[r.item_id] !== undefined) commitQty(r.item_id, parseInt(editing[r.item_id]) || 0) }}
                    onStep={d => commitQty(r.item_id, actual(r) + d)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-20 text-center text-sm text-[#5a6678]">No goods match the manifest filter.</p>
      )}
    </div>
  )
}

// ── Crate (compact card) ───────────────────────────────────────────
function Crate({
  row, qty, health, value, flash, onEdit, onBlur, onStep,
}: {
  row: BarterRow
  qty: number
  health: Health
  value: string
  flash: boolean
  onEdit: (v: string) => void
  onBlur: () => void
  onStep: (d: number) => void
}) {
  const held = qty > 0
  const h = HEALTH[health]

  return (
    <div
      className="group relative flex flex-col items-center rounded-xl border p-2 text-center transition-all duration-200"
      style={{
        borderColor: h.ring,
        background: h.soft,
        boxShadow: held ? `0 4px 16px rgba(0,0,0,0.3)` : 'none',
      }}
    >
      {/* Thumbnail — rendered near native size so the 44px icon stays crisp */}
      <div className="relative mb-1.5">
        <div
          className={`relative h-14 w-14 overflow-hidden rounded-lg border grade-frame-${row.grade}`}
          style={{ backgroundColor: GRADE_BG[row.grade] ?? '#171f2b' }}
        >
          {row.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.image_url}
              alt={row.name}
              className="h-full w-full object-contain p-0.5 transition-transform duration-300 group-hover:scale-110"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
        {/* Tier badge */}
        <span className="absolute -left-1 -top-1 rounded-md px-1 py-px font-display text-[9px] font-bold leading-none"
          style={{ color: GRADE_DOT[row.grade], background: 'rgba(6,10,18,0.85)', boxShadow: `inset 0 0 0 1px ${GRADE_DOT[row.grade]}55` }}>
          {ROMAN[row.tier] ?? row.tier}
        </span>
        {/* Qty badge — health colored */}
        {held && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums"
            style={{ background: h.c, color: '#0a0d12', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
            {qty}
          </span>
        )}
      </div>

      {/* Names */}
      <p className={`w-full truncate font-thai text-xs leading-snug grade-${row.grade}`} title={row.name_th ?? row.name}>
        {row.name_th ?? row.name}
      </p>
      <p className="mb-1.5 w-full truncate text-[10px] leading-snug text-[#6b7686]" title={row.name}>{row.name}</p>

      {/* Stepper */}
      <div className="flex w-full items-center gap-1">
        <StepBtn label="Decrease" disabled={qty <= 0} onClick={() => onStep(-1)}>−</StepBtn>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={e => onEdit(e.target.value)}
          onBlur={onBlur}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-full min-w-0 rounded-md border px-1 py-1 text-center text-sm tabular-nums outline-none transition-colors"
          style={
            flash
              ? { borderColor: '#3f9b54', background: 'rgba(20,40,24,0.7)', color: '#7ee29a' }
              : held
                ? { borderColor: `${h.c}66`, background: 'rgba(17,29,48,0.7)', color: h.c }
                : { borderColor: 'rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7686' }
          }
        />
        <StepBtn label="Increase" onClick={() => onStep(1)}>+</StepBtn>
      </div>
    </div>
  )
}

function StepBtn({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md border text-sm leading-none transition-colors disabled:opacity-30 hover:border-[var(--brass-dim)] hover:text-[var(--brass-light)]"
      style={{ borderColor: 'rgba(200,168,75,0.16)', color: '#9fb0c4' }}
    >
      {children}
    </button>
  )
}

function ThrField({ label, color, value, onCommit }: { label: string; color: string; value: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  // Re-sync when the saved value changes elsewhere (e.g. green clamped up to red).
  useEffect(() => { setV(String(value)) }, [value])
  return (
    <label className="flex flex-1 items-center gap-1.5">
      <span className="flex items-center gap-1 text-[11px]" style={{ color }}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}
      </span>
      <input
        type="number"
        min={0}
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => onCommit(parseInt(v) || 0)}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className="w-14 rounded-md border bg-transparent px-1.5 py-1 text-center text-sm tabular-nums text-[#c8c3b4] outline-none focus:border-[var(--brass-dim)]"
        style={{ borderColor: 'rgba(200,168,75,0.16)' }}
      />
    </label>
  )
}

function HealthChip({ color, n }: { color: string; n: number }) {
  return (
    <span className="flex items-center gap-1" style={{ color: n > 0 ? color : '#3f4856' }}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: n > 0 ? color : '#3f4856' }} />
      {n}
    </span>
  )
}

function TierPill({ children, active, dot, onClick }: { children: React.ReactNode; active: boolean; dot?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-semibold tracking-wider transition-colors"
      style={active
        ? { background: 'rgba(200,168,75,0.12)', color: '#e2c97e', borderColor: 'rgba(200,168,75,0.4)' }
        : { color: '#7a8499', borderColor: 'rgba(200,168,75,0.12)' }}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
      {children}
    </button>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent?: boolean }) {
  return (
    <div
      className="min-w-[108px] rounded-xl border px-4 py-3"
      style={{
        borderColor: accent ? 'rgba(200,168,75,0.35)' : 'rgba(200,168,75,0.14)',
        background: accent ? 'rgba(200,168,75,0.07)' : 'rgba(8,13,22,0.5)',
      }}
    >
      <p className="font-display text-[10px] uppercase tracking-[0.18em] text-[#5a6678]">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold tabular-nums" style={{ color: accent ? 'var(--brass-light)' : '#c8c3b4' }}>
        {value}
      </p>
      <p className="text-[11px] text-[#5a6678]">{sub}</p>
    </div>
  )
}
