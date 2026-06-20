'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function GoalDeleteButton({
  goalId,
  redirectTo,
  label = 'Remove',
}: {
  goalId:      number
  redirectTo?: string
  label?:      string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Remove this goal?')) return
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' })
      if (res.ok) {
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title={label}
      className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 hover:border-red-800 hover:bg-red-950/40 hover:text-red-400 transition-colors disabled:opacity-40"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
      </svg>
      {isPending ? '…' : label}
    </button>
  )
}
