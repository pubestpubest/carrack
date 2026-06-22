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

export default function GoalsList({ goals }: { goals: GoalVM[] }) {
  return (
    <div className="space-y-8" data-tour="goals-manage">
      <GoalSection title="Ship Goals"      addHref="/goals/new"                goals={goals.filter(g => g.type === 'ship')}      empty="No ship goals yet." />
      <GoalSection title="Equipment Goals" addHref="/goals/new?type=equipment" goals={goals.filter(g => g.type === 'equipment')} empty="No equipment goals yet." />
    </div>
  )
}

function GoalSection({ title, addHref, goals, empty }: { title: string; addHref: string; goals: GoalVM[]; empty: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          {title} <span className="text-xs font-normal text-gray-500">({goals.length})</span>
        </h2>
        <Link href={addHref} className="text-xs text-blue-400 hover:text-blue-300">+ Add</Link>
      </div>
      {goals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-700 px-4 py-8 text-center text-sm text-gray-500">{empty}</p>
      ) : (
        <div className="space-y-2">{goals.map(g => <GoalRow key={g.id} goal={g} />)}</div>
      )}
    </section>
  )
}

function GoalRow({ goal }: { goal: GoalVM }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function setActive(is_active: boolean) {
    setErr(null)
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active }),
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
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
      goal.isActive ? 'border-blue-700/60 bg-blue-950/20' : 'border-gray-800 bg-gray-900'
    }`}>
      <div
        className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border grade-frame-${goal.grade}`}
        style={{ backgroundColor: GRADE_BG[goal.grade] ?? '#1f2937' }}
      >
        {goal.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={goal.imageUrl} alt={goal.name} className="h-full w-full object-cover" />
        )}
      </div>

      <Link href={`/goals/${goal.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-medium font-thai grade-${goal.grade}`}>{goal.nameTh ?? goal.name}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            goal.isActive ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-800 text-gray-500'
          }`}>
            {goal.isActive ? 'Active' : 'Paused'}
          </span>
        </div>
        <p className="truncate text-xs text-gray-600">{goal.subtitle ?? goal.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${goal.progress}%` }} />
          </div>
          <span className="shrink-0 tabular-nums text-xs text-gray-500">{goal.ready}/{goal.total}</span>
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActive(!goal.isActive)}
            disabled={isPending}
            className="rounded border border-gray-700 px-2.5 py-1 text-xs hover:border-gray-500 disabled:opacity-50"
          >
            {goal.isActive ? 'Pause' : 'Resume'}
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
