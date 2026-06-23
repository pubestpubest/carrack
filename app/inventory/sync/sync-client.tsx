'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Catalogue = {
  item_id:   number
  name:      string
  name_th:   string | null
  grade:     string
  category:  string
  image_url: string | null
  qty_have:  number
}

// One reviewed row: the catalogue item + scanned qty (editable) + whether to apply it.
type Row = {
  item:       Catalogue
  scanned:    number
  confidence: number
  include:    boolean
}

type ScanCandidate = { item_id: number; qty: number; confidence: number }

const GRADE_BG: Record<string, string> = {
  white: '#1f2937', green: '#14290d', blue: '#0c1a2e',
  yellow: '#2a1f00', orange: '#2a1000', red: '#2a0a0a',
}

export default function InventorySync({ catalogue }: { catalogue: Catalogue[] }) {
  const router = useRouter()
  const byId = useMemo(() => new Map(catalogue.map(c => [c.item_id, c])), [catalogue])

  const [preview,  setPreview]  = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [rows,     setRows]     = useState<Row[]>([])
  const [skipped,  setSkipped]  = useState(0)
  const [error,    setError]    = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const urlRef  = useRef<string | null>(null)

  function setPreviewUrl(url: string | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = url
    setPreview(url)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setScanning(true); setError(null); setRows([]); setSkipped(0)
    setPreviewUrl(URL.createObjectURL(file))
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/inventory/session/scan', { method: 'POST', body: fd })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error ?? 'สแกนภาพไม่สำเร็จ')
      const cands: ScanCandidate[] = j?.candidates ?? []
      const next: Row[] = []
      // Keep scan order (row-major = image reading order) so the list lines up
      // with the screenshot for easy side-by-side review.
      for (const c of cands) {
        const item = byId.get(c.item_id)
        if (!item) continue
        next.push({ item, scanned: c.qty, confidence: c.confidence, include: true })
      }
      setRows(next)
      setSkipped(j?.skipped ?? 0)
      if (next.length === 0) setError('ไม่พบไอเทมในภาพ ลองถ่าย/ครอบให้ตรงช่องเก็บของ')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สแกนภาพไม่สำเร็จ')
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function setScanned(id: number, v: number) {
    setRows(prev => prev.map(r => r.item.item_id === id ? { ...r, scanned: Math.max(0, v) } : r))
  }
  function toggle(id: number) {
    setRows(prev => prev.map(r => r.item.item_id === id ? { ...r, include: !r.include } : r))
  }

  // Only rows that are included AND actually change the current quantity.
  const changes = rows.filter(r => r.include && r.scanned !== r.item.qty_have)

  async function apply() {
    if (changes.length === 0) return
    setApplying(true); setError(null)
    try {
      const results = await Promise.all(changes.map(r =>
        fetch(`/api/inventory/${r.item.item_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qty: r.scanned }),
        }),
      ))
      const failed = results.filter(r => !r.ok).length
      if (failed > 0) throw new Error(`บันทึกไม่สำเร็จ ${failed} รายการ`)
      router.push('/inventory')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
      setApplying(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-display uppercase tracking-[0.25em] text-brass/60">Inventory Sync</p>
          <h1 className="font-display text-2xl font-semibold tracking-wider text-brass-light">ซิงค์คลังจากภาพหน้าจอ</h1>
          <p className="mt-1 text-sm text-[#7a8699] font-thai">อัปโหลดภาพคลัง ระบบจะอ่านจำนวนแล้ว<b className="text-brass-light"> เขียนทับ</b> ไอเทมที่เจอ (ไอเทมที่ไม่เจอในภาพไม่ถูกแตะต้อง)</p>
        </div>
        <Link href="/inventory" className="shrink-0 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 font-thai">← คลัง</Link>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? undefined)} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Left: image */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="ภาพที่สแกน" className="w-full rounded-xl border" style={{ borderColor: 'var(--brass-dim)' }} />
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center transition-colors hover:bg-gray-900/40"
              style={{ borderColor: 'var(--brass-dim)' }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brass-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="text-sm text-brass-light font-thai">แตะเพื่อเลือกภาพหน้าจอคลัง</span>
            </button>
          )}
          {preview && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              className="mt-3 w-full rounded-lg border px-3 py-2 text-xs font-semibold font-thai disabled:opacity-50"
              style={{ borderColor: 'var(--brass-dim)', color: 'var(--brass-light)' }}
            >
              {scanning ? 'กำลังอ่านภาพ…' : 'เลือกภาพใหม่'}
            </button>
          )}
        </div>

        {/* Right: detected list */}
        <div>
          {scanning && <p className="text-sm text-gray-500 font-thai">กำลังอ่านภาพ…</p>}
          {error && <p className="mb-3 text-sm text-red-400 font-thai">{error}</p>}
          {skipped > 0 && <p className="mb-3 text-xs text-amber-500/80 font-thai">ข้าม {skipped} ไอเทมที่ระบบไม่รู้จัก</p>}

          {rows.length > 0 && (
            <>
              <p className="mb-3 text-xs text-gray-500 font-thai">เจอ {rows.length} ไอเทม · จะอัปเดต {changes.length} · ปัจจุบัน → สแกน (แก้ไข/เอาออกได้)</p>
              <div className="space-y-2">
                {rows.map(({ item, scanned, confidence, include }) => {
                  const changed = scanned !== item.qty_have
                  return (
                    <div
                      key={item.item_id}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition-opacity ${include ? 'border-gray-800 bg-gray-900/60' : 'border-gray-900 bg-gray-950/40 opacity-50'}`}
                    >
                      <input type="checkbox" checked={include} onChange={() => toggle(item.item_id)} className="h-4 w-4 shrink-0 accent-[var(--brass)]" />
                      <div
                        className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg border grade-frame-${item.grade}`}
                        style={{ backgroundColor: GRADE_BG[item.grade] ?? '#1f2937' }}
                      >
                        {item.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`truncate text-sm font-medium font-thai grade-${item.grade}`}>{item.name_th ?? item.name}</p>
                          <span
                            className={`shrink-0 rounded px-1 text-[9px] font-semibold ${confidence >= 0.85 ? 'bg-green-950/60 text-green-400' : confidence >= 0.7 ? 'bg-amber-950/60 text-amber-400' : 'bg-red-950/60 text-red-400'}`}
                            title="ความมั่นใจของการสแกน"
                          >
                            {Math.round(confidence * 100)}%
                          </span>
                        </div>
                        <p className="truncate text-xs text-gray-600">{item.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
                        <span className="text-gray-500">{item.qty_have}</span>
                        <span className="text-gray-600">→</span>
                        <input
                          type="number"
                          min={0}
                          value={scanned}
                          onChange={e => setScanned(item.item_id, parseInt(e.target.value) || 0)}
                          className={`w-16 rounded-lg border bg-gray-800 px-2 py-1 text-center outline-none focus:border-brass-dim ${changed ? 'border-brass-dim text-brass-light' : 'border-gray-700 text-gray-400'}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="sticky bottom-0 mt-4 flex gap-3 border-t bg-[var(--ink-navy)] py-4" style={{ borderColor: 'var(--brass-dim)' }}>
                <button
                  onClick={apply}
                  disabled={changes.length === 0 || applying}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#060a12] transition-all disabled:cursor-not-allowed disabled:opacity-40 font-thai"
                  style={{ background: 'linear-gradient(135deg, #c8a84b 0%, #9a7d34 100%)' }}
                >
                  {applying ? 'กำลังบันทึก…' : `เขียนทับคลัง (${changes.length})`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
