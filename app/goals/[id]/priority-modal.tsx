'use client'

import { useEffect, useState } from 'react'

export type PriorityRow = {
  itemId:    number
  name:      string
  nameTh:    string | null
  grade:     string
  imageUrl:  string | null
  crowPrice: number
  missing:   number
  total:     number
}

const GRADE_BG: Record<string, string> = {
  white: '#171f2b', green: '#13230d', blue: '#0b1a2e', yellow: '#241b06', orange: '#251104', red: '#260b0b',
}

export default function PriorityModal({ rows, have, needed }: { rows: PriorityRow[]; have: number; needed: number }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const max  = rows[0]?.total ?? 1
  const diff = have - needed

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 font-display text-sm font-semibold tracking-wider transition-all hover:brightness-110"
        style={{
          color: '#e2c97e',
          borderColor: 'rgba(200,168,75,0.45)',
          background: 'radial-gradient(120% 140% at 50% -20%, rgba(200,168,75,0.16), transparent 70%)',
        }}
      >
        <FlagIcon />
        Priority
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
          style={{ background: 'rgba(3,6,12,0.74)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-hero-rise relative w-full max-w-2xl overflow-hidden rounded-2xl border"
            style={{
              borderColor: 'rgba(200,168,75,0.3)',
              background: 'linear-gradient(135deg, var(--ink-surface) 0%, rgba(8,13,22,0.96) 100%)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,168,75,0.1)',
            }}
          >
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(200,168,75,0.12), transparent 70%)' }} />

            {/* Header */}
            <div className="relative flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'rgba(200,168,75,0.14)' }}>
              <div>
                <p className="mb-1 font-display text-[11px] uppercase tracking-[0.26em]" style={{ color: 'rgba(200,168,75,0.55)' }}>
                  Where to focus
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-wider" style={{ color: 'var(--brass-light)' }}>
                  Priority
                </h2>
                <p className="mt-0.5 text-sm text-[#7a7464]">Largest Crow&nbsp;Coin gaps still to close</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg border px-2.5 py-1 text-sm text-[#9fb0c4] transition-colors hover:text-[#e2c97e]"
                style={{ borderColor: 'rgba(200,168,75,0.2)' }}
              >
                ✕
              </button>
            </div>

            {/* Totals */}
            <div className="relative flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-3 text-sm tabular-nums" style={{ background: 'rgba(0,0,0,0.18)' }}>
              <span className="text-[#7a8499]">{rows.length} item{rows.length === 1 ? '' : 's'}</span>
              <span className="text-amber-500/80">🪙 {have.toLocaleString()} <span className="text-[#5a6678]">/ {needed.toLocaleString()} needed</span></span>
              <span className={`font-semibold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
              </span>
            </div>

            {/* Ranked list */}
            <div className="relative max-h-[60vh] overflow-y-auto px-4 py-3">
              <ol className="space-y-1.5">
                {rows.map((r, i) => {
                  const pct = Math.max(3, Math.round((r.total / max) * 100))
                  const top = i === 0
                  return (
                    <li
                      key={r.itemId}
                      className="animate-hero-rise relative flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        animationDelay: `${Math.min(i * 35, 350)}ms`,
                        background: top ? 'rgba(200,168,75,0.06)' : 'transparent',
                        boxShadow: top ? 'inset 0 0 0 1px rgba(200,168,75,0.22)' : 'none',
                      }}
                    >
                      {/* Rank */}
                      <span
                        className="w-6 shrink-0 text-center font-display text-sm font-bold tabular-nums"
                        style={{ color: top ? 'var(--brass-light)' : '#5a6678' }}
                      >
                        {i + 1}
                      </span>

                      {/* Icon */}
                      <div
                        className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border grade-frame-${r.grade}`}
                        style={{ backgroundColor: GRADE_BG[r.grade] ?? '#171f2b' }}
                      >
                        {r.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.imageUrl} alt={r.name} className="h-full w-full object-contain p-0.5"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        )}
                      </div>

                      {/* Name + bar */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className={`truncate font-thai text-sm grade-${r.grade}`} title={r.nameTh ?? r.name}>
                            {r.nameTh ?? r.name}
                          </p>
                          <p className="shrink-0 font-display text-base font-bold tabular-nums" style={{ color: 'var(--brass-light)' }}>
                            🪙 {r.total.toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #9a7d34, #e2c97e)' }} />
                          </div>
                          <span className="shrink-0 text-[11px] tabular-nums text-[#6b7686]">
                            {r.crowPrice.toLocaleString()} × {r.missing.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FlagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V4" />
      <path d="M4 4h13l-2.5 4L17 12H4" />
    </svg>
  )
}
