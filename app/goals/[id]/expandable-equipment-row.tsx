'use client'

import { useState } from 'react'
import type { GapRow } from '@/lib/gap-analysis'
import MaterialQtyInput from './material-qty-input'

const GRADE_PLACEHOLDER: Record<string, string> = {
  white:  '#1f2937',
  green:  '#14290d',
  blue:   '#0c1a2e',
  yellow: '#2a1f00',
  orange: '#2a1000',
  red:    '#2a0a0a',
}

type Props = {
  row:  GapRow & { subRows: GapRow[] }
}

export default function ExpandableEquipmentRow({ row }: Props) {
  const hasSubRows       = row.subRows.length > 0
  const [open, setOpen]  = useState(hasSubRows && row.missing > 0)

  return (
    <div>
      {/* ── Main row ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-900/60 transition-colors">
        {/* Image */}
        <div
          className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border grade-frame-${row.grade}`}
          style={{ backgroundColor: GRADE_PLACEHOLDER[row.grade] ?? '#1f2937' }}
        >
          {row.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
          )}
        </div>

        {/* Name + price */}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium grade-${row.grade} leading-snug`}>{row.nameTh ?? row.name}</p>
          <p className="text-xs text-gray-600 leading-snug">{row.name}</p>
          {row.crowCoinPrice != null && (
            <p className="text-xs text-amber-500/60 leading-snug">🪙 {row.crowCoinPrice.toLocaleString()}</p>
          )}
        </div>

        {/* Qty control + needed */}
        <div className="shrink-0 flex items-center gap-1.5 tabular-nums text-sm">
          <MaterialQtyInput itemId={row.itemId} initialQty={row.have} />
          <span className="text-gray-700">/</span>
          <span className="text-gray-500 w-10 text-right">{row.needed.toLocaleString()}</span>
        </div>

        {/* Progress bar */}
        <div className="w-16 shrink-0">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${row.progressPct === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
              style={{ width: `${row.progressPct}%` }}
            />
          </div>
        </div>

        {/* Missing / check + expand toggle */}
        <div className="w-14 shrink-0 flex items-center justify-end gap-1 text-sm tabular-nums">
          {row.missing > 0 ? (
            <span className="font-medium text-red-400">−{row.missing.toLocaleString()}</span>
          ) : (
            <span className="text-emerald-500">✓</span>
          )}
          {hasSubRows && (
            <button
              onClick={() => setOpen(o => !o)}
              className="ml-0.5 text-gray-600 hover:text-gray-300 transition-colors text-xs leading-none"
              title={open ? 'Hide upgrade path' : 'Show upgrade path'}
            >
              {open ? '▴' : '▾'}
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-rows (upgrade path) ────────────────────────────────── */}
      {hasSubRows && open && (
        <div className="ml-[4.5rem] border-l-2 border-gray-800/80 pl-4 pb-1">
          <p className="pt-1.5 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-700">
            Upgrade path
          </p>
          {row.subRows.map(sub => (
            <div key={sub.itemId} className="flex items-center gap-2 py-1.5">
              {/* Small image */}
              <div
                className={`shrink-0 h-9 w-9 rounded overflow-hidden border grade-frame-${sub.grade}`}
                style={{ backgroundColor: GRADE_PLACEHOLDER[sub.grade] ?? '#1f2937' }}
              >
                {sub.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.imageUrl} alt={sub.name} className="h-full w-full object-cover" />
                )}
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium grade-${sub.grade} leading-snug`}>{sub.nameTh ?? sub.name}</p>
                <p className="text-xs text-gray-700 leading-snug">{sub.name}</p>
              </div>

              {/* Qty control */}
              <div className="shrink-0 flex items-center gap-1 text-xs tabular-nums">
                <MaterialQtyInput itemId={sub.itemId} initialQty={sub.have} />
                <span className="text-gray-700">/</span>
                <span className="text-gray-600 w-8 text-right">{sub.needed.toLocaleString()}</span>
              </div>

              {/* Missing */}
              <div className="shrink-0 w-10 text-right text-xs tabular-nums">
                {sub.missing > 0 ? (
                  <span className="text-red-400/80">−{sub.missing.toLocaleString()}</span>
                ) : (
                  <span className="text-emerald-500/80">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
