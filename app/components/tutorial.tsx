'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const STORAGE_KEY = 'carrack-tutorial-done-v1'

type Step = {
  title:      string
  body:       string
  selector?:  string   // element to spotlight
  advanceOn?: string   // user must click this selector to advance (interactive)
  hint?:      string   // shown below body when advanceOn is set
}

const STEPS: Step[] = [
  {
    title: 'ยินดีต้อนรับสู่ Carrack Tracker ⚓',
    body:  'ติดตามความคืบหน้าของคุณสู่เรือ Epheria Carrack — เรือระดับสูงสุดของสาย Life Skill ใน BDO ทัวร์นี้จะพาคุณรู้จักฟีเจอร์หลักทั้งหมด',
  },
  {
    title:    'แผนผังการอัพเกรดเรือ',
    body:     'แสดงเส้นทางการอัพเกรดทั้งหมด ตั้งแต่เรือใบไปจนถึง Carrack แต่ละแบบ เรือปัจจุบันของคุณจะถูกไฮไลต์ และเรือเป้าหมายจะสว่างขึ้น',
    selector: '[data-tour="ship-tree"]',
  },
  {
    title:     'เป้าหมาย — วัตถุดิบที่ต้องการ',
    body:      'หน้า Goals แสดงวัตถุดิบทั้งหมดที่ต้องใช้ พร้อม progress bar และราคา Crow Coin สำหรับซื้อแทนการฟาร์ม',
    selector:  '[data-tour="nav-goals"]',
    advanceOn: '[data-tour="nav-goals"]',
    hint:      'กดเมนู Goals ด้านบนเพื่อไปต่อ',
  },
  {
    title:     'คลังของฉัน — อัพเดทสิ่งที่มี',
    body:      'ใส่จำนวนวัตถุดิบที่คุณมีอยู่แล้ว Progress bar บนหน้า Goals จะอัพเดทอัตโนมัติทันที',
    selector:  '[data-tour="nav-inventory"]',
    advanceOn: '[data-tour="nav-inventory"]',
    hint:      'กดเมนู Inventory ด้านบนเพื่อไปต่อ',
  },
  {
    title:     'แคตตาล็อก — ข้อมูลไอเทม',
    body:      'ค้นหาสูตรผลิต เกรด ราคา Crow Coin และเส้นทาง Enhancement ของไอเทมทุกชิ้น เหมาะสำหรับวางแผนว่าจะฟาร์มหรือซื้ออะไรก่อน',
    selector:  '[data-tour="nav-catalogue"]',
    advanceOn: '[data-tour="nav-catalogue"]',
    hint:      'กดเมนู Catalogue ด้านบนเพื่อไปต่อ',
  },
  {
    title: 'เยี่ยมมาก! คุณพร้อมแล้ว 🎉',
    body:  'ตอนนี้คุณรู้จัก Carrack Tracker ครบทุกส่วนแล้ว กดปุ่ม ? ที่มุมล่างขวาเมื่อไหรก็ได้เพื่อดูทัวร์อีกครั้ง ขอให้โชคดีในการเดินทาง!',
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
  const isFirst      = index === 0
  const isLast       = index === total - 1
  const isInteractive = !!step.advanceOn

  const style: React.CSSProperties = (() => {
    const W  = 340
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const vw = typeof window !== 'undefined' ? window.innerWidth  : 1200

    if (!rect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: W }
    }

    const cx     = rect.left + rect.width / 2
    const left   = Math.max(12, Math.min(cx - W / 2, vw - W - 12))
    const CARD_H = 200
    const belowY = rect.bottom + 14
    const aboveY = rect.top - CARD_H - 14

    if (belowY + CARD_H < vh - 16)  return { position: 'fixed', top: belowY, left, width: W }
    if (aboveY > 16)                 return { position: 'fixed', top: aboveY, left, width: W }
    return { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', width: W }
  })()

  return (
    <div style={{ ...style, zIndex: 10000 }}
         className="rounded-2xl border border-gray-700/80 bg-gray-950 p-5 shadow-[0_8px_48px_rgba(0,0,0,0.9)]">

      {/* Progress dots */}
      <div className="mb-4 flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
            i === index ? 'w-5 bg-amber-400' : i < index ? 'w-2 bg-gray-600' : 'w-2 bg-gray-800'
          }`} />
        ))}
        <span className="ml-auto text-[10px] tabular-nums text-gray-600">{index + 1} / {total}</span>
      </div>

      <h3 className="mb-1.5 text-sm font-bold text-gray-100 font-thai">{step.title}</h3>
      <p  className="text-xs leading-relaxed text-gray-400 font-thai">{step.body}</p>

      {/* Interactive hint — shown instead of Next button */}
      {isInteractive && step.hint && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-800/40 bg-amber-950/30 px-3 py-2">
          <span className="text-base leading-none">☝️</span>
          <span className="text-xs font-semibold text-amber-400 font-thai">{step.hint}</span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {isFirst ? (
          <button onClick={onSkip}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors font-thai">
            ข้ามทัวร์
          </button>
        ) : (
          <button onClick={onPrev}
            className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-700 hover:text-gray-300 transition-colors font-thai">
            ← ย้อนกลับ
          </button>
        )}

        <div className="flex-1" />

        {/* Skip step (for interactive steps) */}
        {isInteractive && !isLast && (
          <button onClick={onNext}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors font-thai">
            ข้าม
          </button>
        )}

        {/* Next / Done for non-interactive steps */}
        {!isInteractive && (
          isLast ? (
            <button onClick={onDone}
              className="rounded-lg border border-amber-700/60 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors font-thai">
              เสร็จสิ้น ✓
            </button>
          ) : (
            <button onClick={onNext}
              className="rounded-lg border border-amber-700/60 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors font-thai">
              ถัดไป →
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Tutorial() {
  const [mounted, setMounted] = useState(false)
  const [active,  setActive]  = useState(false)
  const [index,   setIndex]   = useState(0)
  const [rect,    setRect]    = useState<DOMRect | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Auto-show once
  useEffect(() => {
    if (!mounted) return
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setActive(true), 900)
      return () => clearTimeout(t)
    }
  }, [mounted])

  const step = STEPS[index]

  // Spotlight target element
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

  // Click listener for interactive steps
  useEffect(() => {
    if (!active || !step.advanceOn) return
    const el = document.querySelector<HTMLElement>(step.advanceOn)
    if (!el) return
    const handler = () => setIndex(i => Math.min(i + 1, STEPS.length - 1))
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [active, index, step.advanceOn])

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
      {/* Re-trigger button */}
      <button
        onClick={open}
        title="เปิดทัวร์"
        className="fixed bottom-5 right-5 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-gray-700/80 bg-gray-900/90 text-sm font-bold text-gray-500 shadow-lg backdrop-blur-sm hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        ?
      </button>

      {active && createPortal(
        <>
          {/* Backdrop — only for steps with no spotlight target (welcome / done) */}
          {!rect && (
            <div className="fixed inset-0 bg-black/60 pointer-events-none"
                 style={{ zIndex: 9990 }} />
          )}

          {/* Static spotlight ring — box-shadow creates the dark surround; interior stays bright */}
          {rect && (
            <div className="pointer-events-none fixed"
              style={{
                zIndex:    9995,
                top:       rect.top    - 6,
                left:      rect.left   - 6,
                width:     rect.width  + 12,
                height:    rect.height + 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 2px rgba(234,179,8,0.7)',
                borderRadius: 10,
              }}
            />
          )}

          {/* Pulsing ring — extra layer when user must click */}
          {rect && step.advanceOn && (
            <div className="pointer-events-none fixed animate-ping"
              style={{
                zIndex:        9996,
                top:           rect.top    - 6,
                left:          rect.left   - 6,
                width:         rect.width  + 12,
                height:        rect.height + 12,
                border:        '2px solid rgba(234,179,8,0.5)',
                borderRadius:  10,
                animationDuration: '1.2s',
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
