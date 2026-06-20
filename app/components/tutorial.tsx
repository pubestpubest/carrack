'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const STORAGE_KEY = 'carrack-tutorial-done-v1'

type Side = 'top' | 'bottom'

type Step = {
  title:     string
  body:      string
  selector?: string
  side?:     Side
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Carrack Tracker',
    body:  'Track your progress toward the Epheria Carrack — the pinnacle of BDO life-skill sailing. This quick tour covers the key features in under a minute.',
  },
  {
    title: 'Ship Progression Tree',
    body:  'The tree shows every upgrade path from Sailboat to each Carrack variant. Your current ship is highlighted; your goal ship will glow when set.',
    selector: '[data-tour="ship-tree"]',
    side:     'bottom',
  },
  {
    title: 'Goals — What to Build',
    body:  'Set a ship goal (which Carrack variant you want) plus any equipment goals. Each goal breaks down every material you need with progress bars.',
    selector: '[data-tour="nav-goals"]',
    side:     'bottom',
  },
  {
    title: 'Inventory — What You Have',
    body:  'Enter the quantities you already own. Progress bars on your Goals update instantly. Filter and sort by grade or quantity to prioritise farming.',
    selector: '[data-tour="nav-inventory"]',
    side:     'bottom',
  },
  {
    title: 'Catalogue — Item Details',
    body:  'Look up any item: recipe, ingredients, crow-coin price, and enhancement paths. Great for planning which materials to farm or buy first.',
    selector: '[data-tour="nav-catalogue"]',
    side:     'bottom',
  },
  {
    title: 'Crow Coin Budget',
    body:  'On each Goal detail page, every missing material shows its crow-coin cost (price × missing qty) so you can see the exact budget to buy your way through.',
    selector: '[data-tour="nav-goals"]',
    side:     'bottom',
  },
]

// ─── Tooltip card ─────────────────────────────────────────────────────────────

function Tooltip({
  step, index, total, rect,
  onNext, onPrev, onDone, onSkip,
}: {
  step:   Step
  index:  number
  total:  number
  rect:   DOMRect | null
  onNext: () => void
  onPrev: () => void
  onDone: () => void
  onSkip: () => void
}) {
  const isFirst = index === 0
  const isLast  = index === total - 1

  const style: React.CSSProperties = (() => {
    if (!rect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 360 }
    }
    const W    = 336
    const left = Math.max(12, Math.min(rect.left, (typeof window !== 'undefined' ? window.innerWidth : 1200) - W - 12))
    if (step.side === 'top') {
      return { position: 'fixed', bottom: `calc(100vh - ${rect.top - 16}px)`, left, width: W }
    }
    return { position: 'fixed', top: rect.bottom + 14, left, width: W }
  })()

  return (
    <div style={{ ...style, zIndex: 10000 }}
         className="rounded-2xl border border-gray-700/80 bg-gray-950 p-5 shadow-[0_8px_48px_rgba(0,0,0,0.8)]">
      {/* Progress */}
      <div className="mb-4 flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
            i === index ? 'w-5 bg-amber-400' : i < index ? 'w-2 bg-gray-600' : 'w-2 bg-gray-800'
          }`} />
        ))}
        <span className="ml-auto text-[10px] tabular-nums text-gray-600">{index + 1} / {total}</span>
      </div>

      <h3 className="mb-1.5 text-sm font-bold text-gray-100">{step.title}</h3>
      <p  className="text-xs leading-relaxed text-gray-400">{step.body}</p>

      <div className="mt-4 flex items-center gap-2">
        {isFirst ? (
          <button onClick={onSkip}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Skip tour
          </button>
        ) : (
          <button onClick={onPrev}
            className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-700 hover:text-gray-300 transition-colors">
            ← Back
          </button>
        )}
        <div className="flex-1" />
        {isLast ? (
          <button onClick={onDone}
            className="rounded-lg border border-amber-700/60 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors">
            Done ✓
          </button>
        ) : (
          <button onClick={onNext}
            className="rounded-lg border border-amber-700/60 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors">
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Tutorial() {
  const [mounted, setMounted]   = useState(false)
  const [active,  setActive]    = useState(false)
  const [index,   setIndex]     = useState(0)
  const [rect,    setRect]      = useState<DOMRect | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Auto-show once per device
  useEffect(() => {
    if (!mounted) return
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setActive(true), 900)
      return () => clearTimeout(t)
    }
  }, [mounted])

  const step = STEPS[index]

  // Spotlight the target element
  useEffect(() => {
    if (!active || !step.selector) { setRect(null); return }
    const el = document.querySelector<HTMLElement>(step.selector)
    if (el) {
      setRect(el.getBoundingClientRect())
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      setRect(null)
    }
  }, [active, index, step.selector])

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setActive(false)
  }, [])

  const open = useCallback(() => {
    setIndex(0)
    setActive(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      {/* Re-trigger button — always visible in bottom-right corner */}
      <button
        onClick={open}
        title="Open tutorial"
        className="fixed bottom-5 right-5 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-gray-700/80 bg-gray-900/90 text-sm font-bold text-gray-500 shadow-lg backdrop-blur-sm hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        ?
      </button>

      {active && createPortal(
        <>
          {/* Dark backdrop — click outside to dismiss */}
          <div
            onClick={finish}
            className="fixed inset-0 bg-black/65 backdrop-blur-[2px]"
            style={{ zIndex: 9990 }}
          />

          {/* Spotlight ring */}
          {rect && (
            <div
              className="pointer-events-none fixed rounded-lg"
              style={{
                zIndex:    9995,
                top:       rect.top    - 6,
                left:      rect.left   - 6,
                width:     rect.width  + 12,
                height:    rect.height + 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 2px rgba(234,179,8,0.7), 0 0 16px 2px rgba(234,179,8,0.25)',
                borderRadius: 10,
              }}
            />
          )}

          {/* Tooltip */}
          <Tooltip
            step={step} index={index} total={STEPS.length} rect={rect}
            onNext={() => setIndex(i => Math.min(i + 1, STEPS.length - 1))}
            onPrev={() => setIndex(i => Math.max(i - 1, 0))}
            onDone={finish}
            onSkip={finish}
          />
        </>,
        document.body,
      )}
    </>
  )
}
