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
      className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
    >
      {isPending ? '…' : label}
    </button>
  )
}
