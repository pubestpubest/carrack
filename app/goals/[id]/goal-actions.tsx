'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TablesUpdate } from '@/lib/types/database'

export default function GoalActions({
  goalId,
  isActive,
  canCraft,
}: {
  goalId:   number
  isActive: boolean
  canCraft: boolean
}) {
  const router = useRouter()
  const [craftError, setCraftError]  = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  async function toggleActive() {
    startTransition(async () => {
      const supabase = createClient()
      const update: TablesUpdate<'user_goals'> = { is_active: !isActive }
      await supabase.from('user_goals').update(update).eq('id', goalId)
      router.refresh()
    })
  }

  async function executeCraft() {
    setCraftError(null)
    startTransition(async () => {
      const res = await fetch('/api/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      })
      if (!res.ok) {
        const json = await res.json()
        setCraftError(json.error ?? 'Craft failed')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={toggleActive}
          disabled={isPending}
          className="rounded border border-gray-700 px-3 py-1.5 text-sm hover:border-gray-500 disabled:opacity-50"
        >
          {isActive ? 'Pause' : 'Resume'}
        </button>
        {canCraft && (
          <button
            onClick={executeCraft}
            disabled={isPending}
            className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
          >
            ⚒ Craft
          </button>
        )}
      </div>
      {craftError && <p className="text-xs text-red-400">{craftError}</p>}
    </div>
  )
}
