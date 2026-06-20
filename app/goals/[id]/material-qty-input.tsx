'use client'

import { useState, useTransition } from 'react'

export default function MaterialQtyInput({
  itemId,
  initialQty,
  size = 'md',
}: {
  itemId:     number
  initialQty: number
  size?:      'sm' | 'md'
}) {
  const [qty, setQty] = useState(initialQty)
  const [flash, setFlash] = useState(false)
  const [, startTransition] = useTransition()

  function save(newQty: number) {
    const clamped = Math.max(0, newQty)
    setQty(clamped)
    startTransition(async () => {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ qty: clamped }),
      })
      if (res.ok) {
        setFlash(true)
        setTimeout(() => setFlash(false), 800)
      }
    })
  }

  const textCls  = size === 'md' ? 'text-base' : 'text-sm'
  const inputW   = size === 'md' ? 'w-14'      : 'w-11'

  return (
    <div className={`flex items-center rounded border transition-colors ${
      flash ? 'border-green-600/60 bg-green-950/30' : 'border-gray-700/50 bg-gray-800/30'
    }`}>
      <button
        onClick={() => save(qty - 1)}
        className={`px-1.5 py-0.5 text-gray-500 hover:text-gray-200 ${textCls} leading-none`}
      >−</button>
      <input
        type="number"
        min={0}
        value={qty}
        onChange={e => setQty(Math.max(0, parseInt(e.target.value) || 0))}
        onBlur={e  => save(Math.max(0, parseInt(e.target.value) || 0))}
        className={`${inputW} bg-transparent text-center ${textCls} tabular-nums text-gray-200 outline-none py-0.5`}
      />
      <button
        onClick={() => save(qty + 1)}
        className={`px-1.5 py-0.5 text-gray-500 hover:text-gray-200 ${textCls} leading-none`}
      >+</button>
    </div>
  )
}
