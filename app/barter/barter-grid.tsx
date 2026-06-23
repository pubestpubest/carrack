'use client'

import { useMemo, useState, useTransition } from 'react'

export type BarterRow = {
  item_id:   number
  name:      string
  name_th:   string | null
  grade:     string
  tier:      number
  image_url: string | null
  qty_have:  number
}

const GRADE_BG: Record<string, string> = {
  white: '#171f2b', green: '#13230d', blue: '#0b1a2e', yellow: '#241b06', orange: '#251104', red: '#260b0b',
}
const GRADE_DOT: Record<string, string> = {
  white: '#d0cfc8', green: '#4ade80', blue: '#7dc4f0', yellow: '#fbbf24', orange: '#fb923c', red: '#f87171',
}
const GRADE_GLOW: Record<string, string> = {
  white: 'rgba(208,207,200,0.30)', green: 'rgba(74,222,128,0.32)', blue: 'rgba(125,196,240,0.34)',
  yellow: 'rgba(251,191,36,0.34)', orange: 'rgba(251,146,60,0.34)', red: 'rgba(248,113,113,0.34)',
}
const GRADE_NAME: Record<string, string> = {
  white: 'Common', green: 'Uncommon', blue: 'Rare', yellow: 'Choice', orange: 'Prime', red: 'Mythic',
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export default function BarterHold({ rows }: { rows: BarterRow[] }) {
  const [search,   setSearch]   = useState('')
  const [tier,     setTier]     = useState<number | null>(null)
  const [heldOnly, setHeldOnly] = useState(false)

  const [editing, setEditing] = useState<Record<number, string>>({})
  const [saved,   setSaved]   = useState<Record<number, number>>({})
  const [flash,   setFlash]   = useState<Record<number, boolean>>({})
  const [, startTransition]   = useTransition()

  const actual = (r: BarterRow) => saved[r.item_id] ?? r.qty_have
  const input  = (r: BarterRow) =>
    editing[r.item_id] !== undefined ? editing[r.item_id] : String(actual(r))

  function commit(itemId: number, next: number) {
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

  const tiers = useMemo(() => [...new Set(rows.map(r => r.tier))].sort((a, b) => a - b), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    const q = search.trim().toLowerCase()
    return (!q || r.name.toLowerCase().includes(q) || (r.name_th ?? '').includes(search.trim()))
      && (tier === null || r.tier === tier)
      && (!heldOnly || actual(r) > 0)
  }), [rows, search, tier, heldOnly, saved]) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const m = new Map<number, BarterRow[]>()
    for (const r of filtered) (m.get(r.tier) ?? m.set(r.tier, []).get(r.tier)!).push(r)
    return m
  }, [filtered])

  // ── manifest totals ──────────────────────────────────────────────
  const goodsHeld   = rows.filter(r => actual(r) > 0).length
  const totalUnits  = rows.reduce((s, r) => s + actual(r), 0)
  const tiersStock  = new Set(rows.filter(r => actual(r) > 0).map(r => r.tier)).size

  return (
    <div className="mx-auto max-w-7xl px-6 py-9">
      {/* ── Hero: cargo manifest banner ─────────────────────────────── */}
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
            <Stat label="Goods Held"    value={goodsHeld}             sub={`of ${rows.length}`} accent />
            <Stat label="Total Units"   value={totalUnits.toLocaleString()} sub="in hold" />
            <Stat label="Tiers Stocked" value={`${tiersStock}/${tiers.length}`} sub="laden" />
          </div>
        </div>
      </header>

      {/* ── Controls ────────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
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
          <TierPill active={tier === null} onClick={() => setTier(null)}>All</TierPill>
          {tiers.map(t => {
            const g = rows.find(r => r.tier === t)?.grade ?? 'white'
            return (
              <TierPill key={t} active={tier === t} dot={GRADE_DOT[g]} onClick={() => setTier(tier === t ? null : t)}>
                {ROMAN[t] ?? t}
              </TierPill>
            )
          })}
        </div>

        <button
          onClick={() => setHeldOnly(v => !v)}
          className="rounded-xl border px-3.5 py-2.5 font-display text-xs uppercase tracking-widest transition-colors"
          style={heldOnly
            ? { background: 'linear-gradient(135deg,#e2c97e,#c8a84b)', color: '#060a12', borderColor: 'transparent' }
            : { color: '#9fb0c4', borderColor: 'rgba(200,168,75,0.18)' }}
        >
          Held only
        </button>
      </div>

      {/* ── Tier shelves ────────────────────────────────────────────── */}
      <div className="space-y-9">
        {tiers.map((t, idx) => {
          const items = grouped.get(t)
          if (!items || items.length === 0) return null
          const g        = items[0].grade
          const heldHere = items.filter(r => actual(r) > 0).length

          return (
            <section key={t} className="animate-hero-rise" style={{ animationDelay: `${idx * 60}ms` }}>
              {/* Shelf header band */}
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 font-display text-sm font-bold"
                  style={{ color: GRADE_DOT[g], background: GRADE_BG[g], boxShadow: `inset 0 0 0 1px ${GRADE_GLOW[g]}` }}
                >
                  {ROMAN[t] ?? t}
                </span>
                <div className="leading-tight">
                  <p className="font-display text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--brass-light)' }}>
                    Tier {ROMAN[t] ?? t}
                  </p>
                  <p className="text-xs" style={{ color: GRADE_DOT[g] }}>{GRADE_NAME[g] ?? g}</p>
                </div>
                <span className="ml-1 rounded-full px-2.5 py-0.5 text-xs tabular-nums" style={{ background: 'rgba(255,255,255,0.04)', color: '#7a8499' }}>
                  {heldHere}/{items.length} held
                </span>
                <div className="ml-2 h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(200,168,75,0.22), transparent)' }} />
              </div>

              {/* Crates */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {items.map(r => (
                  <Crate
                    key={r.item_id}
                    row={r}
                    qty={actual(r)}
                    value={input(r)}
                    flash={!!flash[r.item_id]}
                    onEdit={v => setEditing(p => ({ ...p, [r.item_id]: v }))}
                    onBlur={() => { if (editing[r.item_id] !== undefined) commit(r.item_id, parseInt(editing[r.item_id]) || 0) }}
                    onStep={d => commit(r.item_id, actual(r) + d)}
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

// ── Crate (item card) ──────────────────────────────────────────────
function Crate({
  row, qty, value, flash, onEdit, onBlur, onStep,
}: {
  row: BarterRow
  qty: number
  value: string
  flash: boolean
  onEdit: (v: string) => void
  onBlur: () => void
  onStep: (d: number) => void
}) {
  const held = qty > 0
  const glow = GRADE_GLOW[row.grade] ?? 'rgba(200,168,75,0.3)'

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border p-2.5 transition-all duration-200"
      style={{
        borderColor: held ? glow : 'rgba(255,255,255,0.06)',
        background: held ? 'rgba(17,29,48,0.55)' : 'rgba(13,20,33,0.4)',
        boxShadow: held ? `0 0 0 1px ${glow}, 0 6px 20px rgba(0,0,0,0.35)` : 'none',
        opacity: held ? 1 : 0.86,
      }}
    >
      {/* Portrait */}
      <div className="relative mb-2">
        <div
          className={`relative aspect-square w-full overflow-hidden rounded-lg border grade-frame-${row.grade}`}
          style={{ backgroundColor: GRADE_BG[row.grade] ?? '#171f2b' }}
        >
          {held && (
            <div aria-hidden className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(120% 120% at 50% 120%, ${glow}, transparent 60%)` }} />
          )}
          {row.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.image_url}
              alt={row.name}
              className="relative h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
        {/* Tier badge */}
        <span
          className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 font-display text-[10px] font-bold leading-none"
          style={{ color: GRADE_DOT[row.grade], background: 'rgba(6,10,18,0.78)', boxShadow: `inset 0 0 0 1px ${glow}` }}
        >
          {ROMAN[row.tier] ?? row.tier}
        </span>
        {/* Held qty badge */}
        {held && (
          <span
            className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums"
            style={{ background: 'linear-gradient(135deg,#e2c97e,#c8a84b)', color: '#060a12', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            {qty}
          </span>
        )}
      </div>

      {/* Names */}
      <p className={`truncate font-thai text-sm leading-snug grade-${row.grade}`} title={row.name_th ?? row.name}>
        {row.name_th ?? row.name}
      </p>
      <p className="mb-2 truncate text-[11px] leading-snug text-[#6b7686]" title={row.name}>{row.name}</p>

      {/* Stepper */}
      <div className="mt-auto flex items-center gap-1">
        <StepBtn label="Decrease" disabled={qty <= 0} onClick={() => onStep(-1)}>−</StepBtn>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={e => onEdit(e.target.value)}
          onBlur={onBlur}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-full min-w-0 rounded-md border px-1 py-1.5 text-center text-sm tabular-nums outline-none transition-colors"
          style={
            flash
              ? { borderColor: '#3f9b54', background: 'rgba(20,40,24,0.7)', color: '#7ee29a' }
              : held
                ? { borderColor: 'rgba(200,168,75,0.30)', background: 'rgba(17,29,48,0.7)', color: '#e2c97e' }
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
      className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md border text-base leading-none transition-colors disabled:opacity-30 hover:border-[var(--brass-dim)] hover:text-[var(--brass-light)]"
      style={{ borderColor: 'rgba(200,168,75,0.16)', color: '#9fb0c4' }}
    >
      {children}
    </button>
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
