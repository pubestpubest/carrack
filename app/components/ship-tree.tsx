'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Static tree layout ────────────────────────────────────────────────────────

const NW = 128  // node width
const NH = 112  // node height
const IMG_H = 64  // image area height inside node

type NodeId =
  | 'batali' | 'sailboat' | 'frigate' | 'sailboat_mod'
  | 'caravel' | 'galleass' | 'frigate_mod'
  | 'advance' | 'balance' | 'valor' | 'volante'

type NodeDef = {
  id: NodeId
  name: string
  nameTh: string
  desc: string
  cx: number
  y: number
  isLeaf?: boolean
  isCarrack?: boolean
}

const NODES: NodeDef[] = [
  { id: 'batali',       name: 'Batali Sailboat',      nameTh: 'เรือสำเภาบาทิลลี่',           desc: 'Base starting ship',   cx: 500, y: 28  },
  { id: 'sailboat',     name: 'Epheria Sailboat',      nameTh: 'เรือสำเภาเอเฟเรีย',           desc: 'Bartering speed',      cx: 210, y: 198 },
  { id: 'frigate',      name: 'Epheria Frigate',       nameTh: 'เรือฟริเกตเอเฟเรีย',          desc: 'Sea combat speed',     cx: 790, y: 198 },
  { id: 'sailboat_mod', name: 'Sailboat (Modified)',   nameTh: 'เรือสำเภาเอเฟเรียดัดแปลง',   desc: '+Solo cannon skill',   cx: 58,  y: 368, isLeaf: true },
  { id: 'caravel',      name: 'Epheria Caravel',       nameTh: 'เรือการค้าเอเฟเรีย',          desc: 'Bartering path',       cx: 305, y: 368 },
  { id: 'galleass',     name: 'Epheria Galleass',      nameTh: 'เรือแกลลีย์เอเฟเรีย',         desc: 'Combat path',          cx: 695, y: 368 },
  { id: 'frigate_mod',  name: 'Frigate (Modified)',    nameTh: 'เรือฟริเกตเอเฟเรียดัดแปลง',  desc: '+Solo cannon skill',   cx: 942, y: 368, isLeaf: true },
  { id: 'advance',      name: 'Carrack: Advance',      nameTh: 'คาร์แร็ค : ทนทาน',            desc: 'Max cargo & barter',   cx: 168, y: 545, isCarrack: true },
  { id: 'balance',      name: 'Carrack: Balance',      nameTh: 'คาร์แร็ค : สมดุล',             desc: 'All-round balanced',   cx: 396, y: 545, isCarrack: true },
  { id: 'valor',        name: 'Carrack: Valor',        nameTh: 'คาร์แร็ค : ฉุกเฉิน',          desc: 'Max cannon damage',    cx: 604, y: 545, isCarrack: true },
  { id: 'volante',      name: 'Carrack: Volante',      nameTh: 'คาร์แร็ค : แข็งแกร่ง',        desc: 'Max travel speed',     cx: 832, y: 545, isCarrack: true },
]

const EDGES: [NodeId, NodeId][] = [
  ['batali',   'sailboat'],
  ['batali',   'frigate'],
  ['sailboat', 'sailboat_mod'],
  ['sailboat', 'caravel'],
  ['frigate',  'galleass'],
  ['frigate',  'frigate_mod'],
  ['caravel',  'advance'],
  ['caravel',  'balance'],
  ['galleass', 'valor'],
  ['galleass', 'volante'],
]

const FULL_PATHS: Partial<Record<NodeId, NodeId[]>> = {
  advance: ['batali', 'sailboat', 'caravel', 'advance'],
  balance: ['batali', 'sailboat', 'caravel', 'balance'],
  valor:   ['batali', 'frigate',  'galleass','valor'],
  volante: ['batali', 'frigate',  'galleass','volante'],
}

const VARIANT_TO_NODE: Record<string, NodeId> = {
  none:     'batali',
  sailboat: 'sailboat',
  caravel:  'caravel',
  frigate:  'frigate',
  galleass: 'galleass',
  advance:  'advance',
  balance:  'balance',
  valor:    'valor',
  volante:  'volante',
}

// ─── Ship placeholder icon (simple SVG boat silhouette) ───────────────────────
function ShipIcon({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }) {
  const s = size
  return (
    <g fill={color} opacity={0.6}>
      {/* hull */}
      <path d={`M ${cx - s * 0.6} ${cy + s * 0.15} L ${cx - s * 0.45} ${cy + s * 0.45} L ${cx + s * 0.45} ${cy + s * 0.45} L ${cx + s * 0.6} ${cy + s * 0.15} Z`} />
      {/* mast */}
      <rect x={cx - 1.5} y={cy - s * 0.5} width={3} height={s * 0.6} rx={1} />
      {/* sail */}
      <path d={`M ${cx + 1} ${cy - s * 0.45} L ${cx + s * 0.4} ${cy + s * 0.1} L ${cx + 1} ${cy + s * 0.1} Z`} />
    </g>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  currentVariant: string | null
  goalVariant:    string | null
  progress:       number
  missingCount:   number
  totalCount:     number
  goalId:         number | null
}

export default function ShipTree({
  currentVariant,
  goalVariant,
  progress,
  missingCount,
  totalCount,
  goalId,
}: Props) {
  // Pre-test every ship image URL; only show <image> for ones that actually load.
  // SVG <image> fires a non-bubbling error event that React's delegation misses,
  // so we can't rely on onError there. Use the browser Image API instead.
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    for (const node of NODES) {
      if (node.isLeaf) continue
      const img = new window.Image()
      img.src = `/images/ships/${node.id}.webp`
      img.onload = () => setLoadedImages(prev => new Set([...prev, node.id]))
      // onerror → do nothing; node stays absent from loadedImages → ShipIcon shows
    }
  }, [])

  const nodeMap = new Map(NODES.map(n => [n.id, n]))

  const currentId = currentVariant ? (VARIANT_TO_NODE[currentVariant] ?? null) : null
  const goalId_node = goalVariant ? (VARIANT_TO_NODE[goalVariant] ?? null) : null

  // Active edges on path from root through current to goal
  const activeEdgeSet = new Set<string>()
  if (goalId_node) {
    const path = FULL_PATHS[goalId_node] ?? []
    const currentIdx = currentId ? path.indexOf(currentId) : -1
    const startIdx = currentIdx >= 0 ? currentIdx : 0
    for (let i = startIdx; i < path.length - 1; i++) {
      activeEdgeSet.add(`${path[i]}|${path[i + 1]}`)
    }
    // Also highlight edges already passed (dim but gold)
    for (let i = 0; i < startIdx; i++) {
      activeEdgeSet.add(`done|${path[i]}|${path[i + 1]}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      {goalId_node ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Current ship</p>
            <p className="font-semibold text-amber-400">{nodeMap.get(currentId ?? 'batali')?.name ?? '—'}</p>
          </div>
          <div className="text-gray-600">→</div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Goal</p>
            <p className="font-semibold text-blue-400">{nodeMap.get(goalId_node)?.name ?? '—'}</p>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-500">Materials ready</p>
              <p className="text-sm">
                <span className="font-semibold text-green-400">{totalCount - missingCount}</span>
                <span className="text-gray-500"> / {totalCount}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Progress</p>
              <p className="text-2xl font-bold text-white">{progress}%</p>
            </div>
            <div className="w-32">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-700">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {goalId && (
              <Link
                href={`/goals/${goalId}`}
                className="shrink-0 rounded-xl border border-gray-700 px-3 py-1.5 text-xs hover:border-gray-500"
              >
                View materials →
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-5 text-center">
          <p className="text-gray-400">
            No active goal.{' '}
            <Link href="/goals/new" className="text-blue-400 underline underline-offset-2">
              Set a Carrack target
            </Link>{' '}
            to track your progress on the tree.
          </p>
        </div>
      )}

      {/* SVG Tree */}
      <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0d1117] p-2">
        <svg
          viewBox="0 0 1000 690"
          className="w-full min-w-[680px]"
          style={{ maxHeight: '72vh' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="img-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c2840" />
              <stop offset="100%" stopColor="#0d1624" />
            </linearGradient>
            <linearGradient id="img-bg-dead" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#141c28" />
              <stop offset="100%" stopColor="#0a1018" />
            </linearGradient>
          </defs>

          {/* ── Edges ───────────────────────────────────────────────────── */}
          {EDGES.map(([fromId, toId]) => {
            const from = nodeMap.get(fromId)!
            const to   = nodeMap.get(toId)!
            const key  = `${fromId}|${toId}`
            const doneKey = `done|${key}`
            const isActive = activeEdgeSet.has(key)
            const isDone   = activeEdgeSet.has(doneKey)

            const x1 = from.cx
            const y1 = from.y + NH
            const x2 = to.cx
            const y2 = to.y
            const cy = (y1 + y2) / 2

            return (
              <path
                key={key}
                d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
                fill="none"
                stroke={isActive ? '#3b82f6' : isDone ? '#d4a84388' : '#2d3748'}
                strokeWidth={isActive ? 2.5 : isDone ? 1.5 : 1}
                opacity={to.isLeaf ? 0.3 : 1}
              />
            )
          })}

          {/* ── Nodes ───────────────────────────────────────────────────── */}
          {NODES.map(node => {
            const isCurrent = node.id === currentId
            const isGoal    = node.id === goalId_node
            const isLeaf    = node.isLeaf ?? false
            const isCarrack = node.isCarrack ?? false

            const L = node.cx - NW / 2  // left edge
            const T = node.y             // top edge

            const cardBg    = isLeaf ? '#0d1117' : isCarrack ? '#111c2e' : '#111824'
            const stroke    = isCurrent ? '#d4a843' : isGoal ? '#3b82f6' : isCarrack ? '#1e3a5f' : '#1e2d3d'
            const strokeW   = isCurrent || isGoal ? 2.5 : 1.5
            const opacity   = isLeaf ? 0.4 : 1

            const iconColor = isCurrent ? '#d4a843' : isGoal ? '#60a5fa' : isCarrack ? '#2563eb' : '#374151'
            const nameColor = isCurrent ? '#fcd34d' : isGoal ? '#93c5fd' : isLeaf ? '#374151' : '#d1d5db'
            const thaiColor = isCurrent ? '#92400e' : isGoal ? '#1e40af' : '#374151'
            const descColor = isCurrent ? '#78350f' : isGoal ? '#1d4ed8' : '#1e2d3d'

            // Progress bar for goal node
            const barW = NW - 16
            const barFill = barW * (progress / 100)

            return (
              <g key={node.id} opacity={opacity}>
                {/* Glow halo for current/goal */}
                {(isCurrent || isGoal) && (
                  <rect
                    x={L - 4} y={T - 4}
                    width={NW + 8} height={NH + 8}
                    rx={13}
                    fill="none"
                    stroke={isCurrent ? '#d4a843' : '#3b82f6'}
                    strokeWidth={8}
                    opacity={0.25}
                    filter={`url(#glow-${isCurrent ? 'amber' : 'blue'})`}
                  />
                )}

                {/* Card */}
                <rect x={L} y={T} width={NW} height={NH} rx={10}
                  fill={cardBg} stroke={stroke} strokeWidth={strokeW} />

                {/* Image area */}
                <rect x={L + 6} y={T + 6} width={NW - 12} height={IMG_H}
                  rx={6} fill={isLeaf ? 'url(#img-bg-dead)' : 'url(#img-bg)'} />

                {/* Ship icon (always rendered; covered by real image when it loads) */}
                <ShipIcon
                  cx={node.cx}
                  cy={T + 6 + IMG_H / 2 + 2}
                  size={isCarrack ? 26 : 22}
                  color={iconColor}
                />

                {/* Real ship image — only rendered after Image() preload confirms it exists */}
                {loadedImages.has(node.id) && (
                  <image
                    href={`/images/ships/${node.id}.webp`}
                    x={L + 6} y={T + 6}
                    width={NW - 12} height={IMG_H}
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}

                {/* Progress bar (goal node only) */}
                {isGoal && (
                  <>
                    <rect x={L + 8} y={T + 6 + IMG_H + 4} width={barW} height={4} rx={2} fill="#1a2535" />
                    <rect x={L + 8} y={T + 6 + IMG_H + 4} width={barFill} height={4} rx={2} fill="#3b82f6" />
                  </>
                )}

                {/* Name */}
                <text x={node.cx} y={T + IMG_H + 22}
                  textAnchor="middle" fontSize={9.5} fontWeight="700" fill={nameColor}>
                  {node.name}
                </text>
                {/* Thai name */}
                <text x={node.cx} y={T + IMG_H + 34}
                  textAnchor="middle" fontSize={8} fill={thaiColor}>
                  {node.nameTh}
                </text>
                {/* Desc / status */}
                <text x={node.cx} y={T + IMG_H + 46}
                  textAnchor="middle" fontSize={7.5} fill={descColor}>
                  {isCurrent ? '● You are here' : isGoal ? `▶ Goal · ${progress}%` : node.desc}
                </text>

                {/* "NOW" badge */}
                {isCurrent && (
                  <g>
                    <rect x={L + NW - 32} y={T + 5} width={26} height={13} rx={6.5} fill="#d4a843" />
                    <text x={L + NW - 19} y={T + 14.5} textAnchor="middle" fontSize={7} fontWeight="800" fill="#000">NOW</text>
                  </g>
                )}

                {/* "GOAL" badge */}
                {isGoal && (
                  <g>
                    <rect x={L + NW - 34} y={T + 5} width={28} height={13} rx={6.5} fill="#3b82f6" />
                    <text x={L + NW - 20} y={T + 14.5} textAnchor="middle" fontSize={7} fontWeight="800" fill="#fff">GOAL</text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Legend */}
          <g transform="translate(0, 660)">
            <circle cx={16} cy={8} r={5} fill="#d4a843" opacity={0.8} />
            <text x={26} y={12} fontSize={9} fill="#6b7280">Current ship</text>
            <circle cx={110} cy={8} r={5} fill="#3b82f6" opacity={0.8} />
            <text x={120} y={12} fontSize={9} fill="#6b7280">Goal</text>
            <line x1={208} y1={8} x2={228} y2={8} stroke="#3b82f6" strokeWidth={2} />
            <text x={234} y={12} fontSize={9} fill="#6b7280">Upgrade path</text>
            <line x1={316} y1={8} x2={336} y2={8} stroke="#2d3748" strokeWidth={1} />
            <text x={342} y={12} fontSize={9} fill="#6b7280">Other paths</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
