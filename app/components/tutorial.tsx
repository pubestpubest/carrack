'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const STORAGE_KEY = 'carrack-tutorial-done-v3'

type Step = {
  title:      string
  body:       string
  selector?:  string   // element to spotlight
  advanceOn?: string   // CSS selector — clicking ANY match advances (event delegation)
  hint?:      string   // amber hint shown when advanceOn is set
}

const STEPS: Step[] = [
  // ── 1. Welcome ───────────────────────────────────────────────────────────────
  {
    title: 'ยินดีต้อนรับสู่ Carrack Tracker ⚓',
    body:  'ทัวร์นี้จะพาคุณสร้างเป้าหมายจริงๆ อัพเดทคลัง และดูข้อมูลไอเทม — ทำทีละขั้นตอนไปด้วยกัน',
  },
  // ── 2. Ship tree ─────────────────────────────────────────────────────────────
  {
    title:    'แผนผังการอัพเกรดเรือ',
    body:     'แสดงเส้นทางจากเรือใบสู่ Carrack ทุกแบบ สีทองคือเรือเป้าหมายที่คุณตั้งไว้',
    selector: '[data-tour="ship-tree"]',
  },
  // ── 3. Click + New Goal ───────────────────────────────────────────────────────
  {
    title:     'สร้างเป้าหมายใหม่',
    body:      'กดปุ่ม "+ New Goal" ที่มุมขวาของส่วนนี้ เพื่อเริ่มติดตามการสร้าง Carrack',
    selector:  '[data-tour="captain-log-header"]',
    advanceOn: '[data-tour="new-goal"]',
    hint:      'กดปุ่ม + New Goal มุมขวา',
  },
  // ── 4. Click Ship Goal button ────────────────────────────────────────────────
  {
    title:     'เลือกประเภทเป้าหมาย',
    body:      'เลือก "Ship Goal" เพื่อติดตามเส้นทางการอัพเกรดเรือทั้งหมดไปสู่ Carrack',
    selector:  '[data-tour="goal-type-ship"]',
    advanceOn: '[data-tour="goal-type-ship"]',
    hint:      'กดปุ่ม Ship Goal',
  },
  // ── 5. Pick a Carrack ────────────────────────────────────────────────────────
  {
    title:     'เลือก Carrack เป้าหมาย',
    body:      'มี 4 แบบ — Advance (บรรทุก), Balance (รอบด้าน), Valor (รบ), Volante (ความเร็ว) เลือกตามสไตล์ที่ชอบ',
    selector:  '[data-tour="carrack-list"]',
    advanceOn: '[data-tour="carrack-option"]',
    hint:      'คลิก Carrack ที่ต้องการสร้าง',
  },
  // ── 6. Start Tracking ────────────────────────────────────────────────────────
  {
    title:     'เรือปัจจุบันของคุณ',
    body:      'เลือกเรือที่คุณมีอยู่ตอนนี้ เพื่อให้ระบบคำนวณวัตถุดิบที่ยังขาด จากนั้นกด Start Tracking',
    selector:  '[data-tour="ship-current-step"]',
    advanceOn: '[data-tour="start-tracking"]',
    hint:      'เลือกเรือที่มี แล้วกด Start Tracking',
  },
  // ── 7. Browse materials ──────────────────────────────────────────────────────
  {
    title:    'รายการวัตถุดิบที่ต้องการ',
    body:     'แต่ละแถวแสดง จำนวนที่มี / จำนวนที่ต้องการ และราคา Crow Coin ถ้าอยากซื้อแทนฟาร์ม เลื่อนดูรายการทั้งหมดได้เลย',
    selector: '[data-tour="materials-section"]',
    hint:     'เลื่อนดูรายการวัตถุดิบด้านล่าง',
  },
  // ── 8. Go to Inventory ───────────────────────────────────────────────────────
  {
    title:     'อัพเดทคลังของคุณ',
    body:      'ไปหน้า Inventory เพื่อกรอกจำนวนวัตถุดิบที่มีอยู่แล้ว Progress bar จะอัพเดทอัตโนมัติ',
    selector:  '[data-tour="nav-inventory"]',
    advanceOn: '[data-tour="nav-inventory"]',
    hint:      'กดเมนู Inventory ด้านบน',
  },
  // ── 9. Try updating inventory ────────────────────────────────────────────────
  {
    title:    'กรอกจำนวนที่มี',
    body:     'กรอกตัวเลขในช่องของไอเทมที่มี ระบบบันทึกอัตโนมัติและ progress bar บนหน้า Goals จะอัพเดททันที ลองกรอกดูสักรายการ',
    selector: '[data-tour="inventory-table"]',
    hint:     'ลองกรอกจำนวนในช่อง',
  },
  // ── 9b. Quick-record + image scan ────────────────────────────────────────────
  {
    title:    'บันทึกของที่หาได้แบบเร็ว 📸',
    body:     'ปุ่มตะกร้ามุมขวาล่างใช้บันทึกของที่เพิ่งฟาร์มมาได้อย่างรวดเร็ว — เพิ่มเอง หรือกด "สแกนจากภาพหน้าจอคลัง" ให้ระบบอ่านชื่อไอเทมและจำนวนจากภาพให้อัตโนมัติ ตรวจสอบแล้วกดบันทึกเข้าคลังได้เลย',
    selector: '[data-tour="session-gather"]',
    hint:     'ปุ่มตะกร้ามุมขวาล่าง',
  },
  // ── 10. Go to Catalogue ──────────────────────────────────────────────────────
  {
    title:     'ดูข้อมูลไอเทม',
    body:      'Catalogue รวบรวมทุกไอเทม — สูตรผลิต เกรด ราคา Crow Coin และวิธีหา เหมาะสำหรับวางแผนว่าจะฟาร์มหรือซื้ออะไรก่อน',
    selector:  '[data-tour="nav-catalogue"]',
    advanceOn: '[data-tour="nav-catalogue"]',
    hint:      'กดเมนู Catalogue ด้านบน',
  },
  // ── 11. Click a Carrack item ─────────────────────────────────────────────────
  {
    title:     'ดูรายละเอียดไอเทม',
    body:      'คลิกไอเทม Carrack ชิ้นใดก็ได้ เพื่อดูสูตรผลิต วิธีหา และเส้นทาง Enhancement',
    selector:  '[data-tour="catalogue-equipment"]',
    advanceOn: '[data-tour="catalogue-item"]',
    hint:      'คลิกไอเทม Carrack ที่สนใจ',
  },
  // ── 12. Done ─────────────────────────────────────────────────────────────────
  {
    title: 'เยี่ยมมาก! พร้อมออกเดินทางแล้ว 🎉',
    body:  'คุณรู้จัก Carrack Tracker ครบทุกส่วนแล้ว กดปุ่ม ? ที่มุมล่างขวาเมื่อไหรก็ได้เพื่อเริ่มทัวร์ใหม่',
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
  const isFirst       = index === 0
  const isLast        = index === total - 1
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
    const CARD_H = 220
    const belowY = rect.bottom + 14
    const aboveY = rect.top - CARD_H - 14

    if (belowY + CARD_H < vh - 16) return { position: 'fixed', top: belowY, left, width: W }
    if (aboveY > 16)                return { position: 'fixed', top: aboveY, left, width: W }
    // Fallback: avoid overlapping the element by placing on the roomier side
    if (rect.top > vh / 2) return { position: 'fixed', top: Math.max(16, aboveY), left, width: W }
    return { position: 'fixed', top: Math.min(belowY, vh - CARD_H - 16), left, width: W }
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

      {/* Interactive hint */}
      {step.hint && (
        <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${
          isInteractive
            ? 'border-amber-800/40 bg-amber-950/30'
            : 'border-gray-800/60 bg-gray-900/40'
        }`}>
          <span className="text-base leading-none">{isInteractive ? '☝️' : '💡'}</span>
          <span className={`text-xs font-semibold font-thai ${isInteractive ? 'text-amber-400' : 'text-gray-400'}`}>
            {step.hint}
          </span>
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

        {/* Skip step for interactive steps */}
        {isInteractive && !isLast && (
          <button onClick={onNext}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors font-thai">
            ข้าม
          </button>
        )}

        {/* Next / Done for non-interactive (and last) steps */}
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

  // Continuously track spotlight target with rAF — updates on scroll, resize,
  // navigation, and any layout shift; only triggers setState when rect changes.
  useEffect(() => {
    if (!active || !step.selector) { setRect(null); return }

    let rafId: number
    let prev: DOMRect | null = null
    let scrolledOnce = false

    const track = () => {
      const el = document.querySelector<HTMLElement>(step.selector!)
      if (el) {
        const r = el.getBoundingClientRect()
        if (
          !prev ||
          Math.abs(r.top    - prev.top)    > 0.5 ||
          Math.abs(r.left   - prev.left)   > 0.5 ||
          Math.abs(r.width  - prev.width)  > 0.5 ||
          Math.abs(r.height - prev.height) > 0.5
        ) {
          prev = r
          setRect(r)
        }
        if (!scrolledOnce) {
          scrolledOnce = true
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      } else {
        if (prev !== null) { prev = null; setRect(null) }
      }
      rafId = requestAnimationFrame(track)
    }

    rafId = requestAnimationFrame(track)
    return () => cancelAnimationFrame(rafId)
  }, [active, index, step.selector])

  // Click-to-advance via event delegation — works for any matching element
  useEffect(() => {
    if (!active || !step.advanceOn) return
    const selector = step.advanceOn
    const handler = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest(selector)) {
        setIndex(i => Math.min(i + 1, STEPS.length - 1))
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
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
          {/* Backdrop — only for steps without a spotlight target */}
          {!rect && (
            <div className="fixed inset-0 bg-black/60 pointer-events-none"
                 style={{ zIndex: 9990 }} />
          )}

          {/* Spotlight ring — box-shadow creates the dark surround; interior stays bright */}
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

          {/* Pulsing ring when user must click */}
          {rect && step.advanceOn && (
            <div className="pointer-events-none fixed animate-ping"
              style={{
                zIndex:           9996,
                top:              rect.top    - 6,
                left:             rect.left   - 6,
                width:            rect.width  + 12,
                height:           rect.height + 12,
                border:           '2px solid rgba(234,179,8,0.5)',
                borderRadius:     10,
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
