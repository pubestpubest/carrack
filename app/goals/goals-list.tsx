'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export type GoalVM = {
  id:       number
  name:     string
  nameTh:   string | null
  grade:    string
  imageUrl: string | null
  type:     'ship' | 'equipment'
  isActive: boolean
  progress: number
  ready:    number
  total:    number
  subtitle: string | null
}

const GRADE_BG: Record<string, string> = {
  white: '#1f2937', green: '#14290d', blue: '#0c1a2e', yellow: '#2a1f00', orange: '#2a1000', red: '#2a0a0a',
}

// Soft halo behind the active goal's portrait, tinted by grade.
const GRADE_GLOW: Record<string, string> = {
  white:  'rgba(208,207,200,0.18)', green: 'rgba(74,222,128,0.20)', blue: 'rgba(125,196,240,0.22)',
  yellow: 'rgba(251,191,36,0.22)',  orange:'rgba(251,146,60,0.22)', red:  'rgba(248,113,113,0.22)',
}

export default function GoalsList({ goals }: { goals: GoalVM[] }) {
  return (
    <div className="space-y-10" data-tour="goals-manage">
      <GoalSection title="Ship Goals"      addHref="/goals/new"                goals={goals.filter(g => g.type === 'ship')}      empty="No ship goals yet."      label="Ship Expedition" />
      <GoalSection title="Equipment Goals" addHref="/goals/new?type=equipment" goals={goals.filter(g => g.type === 'equipment')} empty="No equipment goals yet." label="Equipment" />
    </div>
  )
}

function GoalSection({ title, addHref, goals, empty, label }: { title: string; addHref: string; goals: GoalVM[]; empty: string; label: string }) {
  const active = goals.find(g => g.isActive) ?? null
  const paused = goals.filter(g => !g.isActive)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between border-b pb-2" style={{ borderColor: 'rgba(200,168,75,0.12)' }}>
        <h2 className="flex items-baseline gap-2 font-display text-sm uppercase tracking-[0.22em]" style={{ color: 'var(--brass-light)' }}>
          {title}
          <span className="text-xs tracking-normal text-[#5a6678]">({goals.length})</span>
        </h2>
        <Link href={addHref} className="font-display text-xs uppercase tracking-widest text-[#6b7a8d] transition-colors hover:text-[var(--brass-light)]">
          + Add
        </Link>
      </div>

      {goals.length === 0 ? (
        <div
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center text-sm text-[#5a6678]"
          style={{ borderColor: 'rgba(200,168,75,0.14)' }}
        >
          <span aria-hidden className="opacity-50">⚓</span> {empty}
        </div>
      ) : (
        <div className="space-y-3">
          {active && <GoalHero goal={active} label={label} />}
          {paused.length > 0 && <div className="space-y-2">{paused.map(g => <GoalRow key={g.id} goal={g} />)}</div>}
        </div>
      )}
    </section>
  )
}

// ─── Hero card for the one active goal in a section ──────────────────────────
function GoalHero({ goal, label }: { goal: GoalVM; label: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function pause() {
    setErr(null)
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }),
      })
      if (!res.ok) { setErr('Failed'); return }
      router.refresh()
    })
  }

  function del() {
    if (!confirm('Delete this goal? This cannot be undone.')) return
    setErr(null)
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed'); return }
      router.refresh()
    })
  }

  return (
    <div
      className="animate-hero-rise relative overflow-hidden rounded-2xl border p-6 sm:p-7"
      style={{
        borderColor: 'rgba(200,168,75,0.30)',
        background: 'linear-gradient(135deg, var(--ink-surface) 0%, rgba(11,18,32,0.85) 100%)',
        boxShadow: '0 10px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,168,75,0.10)',
      }}
    >
      {/* Decorative brass glow, top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(200,168,75,0.12), transparent 70%)' }}
      />

      <div className="relative flex flex-col gap-6 sm:flex-row">
        {/* Portrait */}
        <Link href={`/goals/${goal.id}`} className="group relative mx-auto shrink-0 sm:mx-0">
          <div
            aria-hidden
            className="absolute inset-1 rounded-2xl blur-2xl"
            style={{ background: GRADE_GLOW[goal.grade] ?? 'rgba(200,168,75,0.18)' }}
          />
          <div
            className={`relative h-36 w-36 overflow-hidden rounded-2xl border-2 grade-frame-${goal.grade}`}
            style={{ backgroundColor: GRADE_BG[goal.grade] ?? '#1f2937' }}
          >
            {goal.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={goal.imageUrl}
                alt={goal.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
          </div>
        </Link>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2.5">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-[0.2em]"
              style={{ background: 'linear-gradient(135deg, #e2c97e, #c8a84b)', color: '#060a12' }}
            >
              ● Active
            </span>
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-[#5a6678]">{label}</span>
          </div>

          <Link href={`/goals/${goal.id}`} className="mt-2 block min-w-0">
            <h3 className={`truncate font-thai text-2xl leading-tight sm:text-3xl grade-${goal.grade}`}>
              {goal.nameTh ?? goal.name}
            </h3>
          </Link>
          <p className="mt-1 truncate text-sm text-[#7a7464]">{goal.subtitle ?? goal.name}</p>

          {/* Progress */}
          <div className="mt-auto pt-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="font-display text-[11px] uppercase tracking-[0.2em] text-[#5a6678]">Materials charted</span>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-3xl font-bold leading-none" style={{ color: 'var(--brass-light)' }}>
                  {goal.progress}%
                </span>
                <span className="text-xs text-[#5a6678]">
                  <span className="font-semibold text-[#9fb0c4]">{goal.ready}</span> / {goal.total} ready
                </span>
              </div>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="relative h-full rounded-full"
                style={{ width: `${goal.progress}%`, background: 'linear-gradient(90deg, #9a7d34, #e2c97e)' }}
              >
                <div
                  aria-hidden
                  className="animate-sheen absolute inset-y-0 left-0 w-1/3"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              href={`/goals/${goal.id}`}
              className="rounded-xl px-5 py-2.5 text-sm font-display font-semibold tracking-wider transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #c8a84b 0%, #9a7d34 100%)', color: '#060a12', boxShadow: '0 2px 12px rgba(200,168,75,0.25)' }}
            >
              View materials →
            </Link>
            <button
              onClick={pause}
              disabled={isPending}
              className="rounded-xl border px-4 py-2.5 text-sm transition-colors hover:text-[#c8c3b4] disabled:opacity-50"
              style={{ borderColor: 'rgba(200,168,75,0.20)', color: '#9fb0c4' }}
            >
              Pause
            </button>
            <button
              onClick={del}
              disabled={isPending}
              className="rounded-xl border px-4 py-2.5 text-sm text-red-400/90 transition-colors hover:border-red-700 hover:text-red-300 disabled:opacity-50"
              style={{ borderColor: 'rgba(248,113,113,0.30)' }}
            >
              Delete
            </button>
            {err && <span className="text-xs text-red-400">{err}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Compact row for paused goals (unchanged scale) ──────────────────────────
function GoalRow({ goal }: { goal: GoalVM }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function resume() {
    setErr(null)
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: true }),
      })
      if (!res.ok) { setErr('Failed'); return }
      router.refresh()
    })
  }

  function del() {
    if (!confirm('Delete this goal? This cannot be undone.')) return
    setErr(null)
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed'); return }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 transition-colors hover:border-gray-700">
      <div
        className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border grade-frame-${goal.grade}`}
        style={{ backgroundColor: GRADE_BG[goal.grade] ?? '#1f2937' }}
      >
        {goal.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={goal.imageUrl} alt={goal.name} className="h-full w-full object-cover opacity-90" />
        )}
      </div>

      <Link href={`/goals/${goal.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-medium font-thai grade-${goal.grade}`}>{goal.nameTh ?? goal.name}</p>
          <span className="shrink-0 rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Paused
          </span>
        </div>
        <p className="truncate text-xs text-gray-600">{goal.subtitle ?? goal.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-blue-500/70" style={{ width: `${goal.progress}%` }} />
          </div>
          <span className="shrink-0 tabular-nums text-xs text-gray-500">{goal.ready}/{goal.total}</span>
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex gap-1.5">
          <button
            onClick={resume}
            disabled={isPending}
            className="rounded border border-gray-700 px-2.5 py-1 text-xs hover:border-gray-500 disabled:opacity-50"
          >
            Resume
          </button>
          <button
            onClick={del}
            disabled={isPending}
            className="rounded border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:border-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
        {err && <span className="text-[10px] text-red-400">{err}</span>}
      </div>
    </div>
  )
}
