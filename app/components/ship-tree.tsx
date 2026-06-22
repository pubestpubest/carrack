'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Static tree layout ────────────────────────────────────────────────────────

const NW = 158  // node width
const NH = 138  // node height
const IMG_H = 92  // image area height inside node

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

// Tiers (vertical rows): T1 Batali → T2 Sailboat/Frigate → T2.5 Modified →
// T3 Caravel/Galleass → T4 Carracks. The modified ships are an OPTIONAL detour:
// T2 reaches T3 directly, or via T2.5.
const NODES: NodeDef[] = [
  { id: 'batali',       name: 'Batali Sailboat',      nameTh: 'เรือสำเภาบาทิลลี่',           desc: 'Base ship · T1',       cx: 555, y: 16   },
  { id: 'sailboat',     name: 'Epheria Sailboat',      nameTh: 'เรือสำเภาเอเฟเรีย',           desc: 'Bartering · T2',       cx: 300, y: 178  },
  { id: 'frigate',      name: 'Epheria Frigate',       nameTh: 'เรือฟริเกตเอเฟเรีย',          desc: 'Sea combat · T2',      cx: 810, y: 178  },
  { id: 'sailboat_mod', name: 'Sailboat (Modified)',   nameTh: 'เรือสำเภาเอเฟเรียดัดแปลง',   desc: 'Optional · solo cannon', cx: 150,  y: 340 },
  { id: 'frigate_mod',  name: 'Frigate (Modified)',    nameTh: 'เรือฟริเกตเอเฟเรียดัดแปลง',  desc: 'Optional · solo cannon', cx: 960, y: 340 },
  { id: 'caravel',      name: 'Epheria Caravel',       nameTh: 'เรือการค้าเอเฟเรีย',          desc: 'Bartering · T3',       cx: 330, y: 502  },
  { id: 'galleass',     name: 'Epheria Galleass',      nameTh: 'เรือแกลลีย์เอเฟเรีย',         desc: 'Combat · T3',          cx: 780, y: 502  },
  { id: 'advance',      name: 'Carrack: Advance',      nameTh: 'คาร์แร็ค : ทนทาน',            desc: 'Max cargo & barter',   cx: 228, y: 664, isCarrack: true },
  { id: 'balance',      name: 'Carrack: Balance',      nameTh: 'คาร์แร็ค : สมดุล',             desc: 'All-round balanced',   cx: 432, y: 664, isCarrack: true },
  { id: 'valor',        name: 'Carrack: Valor',        nameTh: 'คาร์แร็ค : ฉุกเฉิน',          desc: 'Max cannon damage',    cx: 678, y: 664, isCarrack: true },
  { id: 'volante',      name: 'Carrack: Volante',      nameTh: 'คาร์แร็ค : แข็งแกร่ง',        desc: 'Max travel speed',     cx: 882, y: 664, isCarrack: true },
]

const EDGES: [NodeId, NodeId][] = [
  ['batali',       'sailboat'],
  ['batali',       'frigate'],
  ['sailboat',     'caravel'],       // direct T2 → T3
  ['sailboat',     'sailboat_mod'],  // optional detour T2 → T2.5
  ['sailboat_mod', 'caravel'],       // optional detour T2.5 → T3
  ['frigate',      'galleass'],      // direct T2 → T3
  ['frigate',      'frigate_mod'],   // optional detour
  ['frigate_mod',  'galleass'],      // optional detour
  ['caravel',      'advance'],
  ['caravel',      'balance'],
  ['galleass',     'valor'],
  ['galleass',     'volante'],
]

// The T2.5 detour edges — drawn dashed/dimmed to read as an alternate route.
const OPTIONAL_EDGES = new Set<string>([
  'sailboat|sailboat_mod', 'sailboat_mod|caravel',
  'frigate|frigate_mod',   'frigate_mod|galleass',
])

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

// Ship card images live in /images/items. Filenames are by visual resemblance;
// the mapping is keyed to the true node identity (confirmed by each card caption).
const SHIP_IMAGE: Record<string, string> = {
  batali:       'batali.png',
  sailboat:     'sailboat.png',
  frigate:      'frigate.png',
  sailboat_mod: 'modified-caraval.png',  // = เรือสำเภาเอเฟเรียดัดแปลง (Modified Sailboat)
  caravel:      'caraval.png',
  galleass:     'galleass.png',
  frigate_mod:  'modified-galleass.png', // = เรือฟริเกตเอเฟเรียดัดแปลง (Modified Frigate)
}

function getImagePath(node: NodeDef): string {
  if (node.isCarrack) return `/images/items/epheria-carrack-${node.id}.png`
  const file = SHIP_IMAGE[node.id]
  return file ? `/images/items/${file}` : ''
}

// ─── Ship placeholder icon ────────────────────────────────────────────────────
function ShipIcon({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }) {
  const s = size
  return (
    <g fill={color} opacity={0.6}>
      <path d={`M ${cx - s * 0.6} ${cy + s * 0.15} L ${cx - s * 0.45} ${cy + s * 0.45} L ${cx + s * 0.45} ${cy + s * 0.45} L ${cx + s * 0.6} ${cy + s * 0.15} Z`} />
      <rect x={cx - 1.5} y={cy - s * 0.5} width={3} height={s * 0.6} rx={1} />
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
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    for (const node of NODES) {
      const src = getImagePath(node)
      if (!src) continue
      const img = new window.Image()
      img.src = src
      img.onload = () => setLoadedImages(prev => new Set([...prev, node.id]))
    }
  }, [])

  const nodeMap = new Map(NODES.map(n => [n.id, n]))

  const currentId   = currentVariant ? (VARIANT_TO_NODE[currentVariant] ?? null) : null
  const goalId_node = goalVariant    ? (VARIANT_TO_NODE[goalVariant]    ?? null) : null

  const activeEdgeSet = new Set<string>()
  if (goalId_node) {
    const path = FULL_PATHS[goalId_node] ?? []
    const currentIdx = currentId ? path.indexOf(currentId) : -1
    const startIdx = currentIdx >= 0 ? currentIdx : 0
    for (let i = startIdx; i < path.length - 1; i++) {
      activeEdgeSet.add(`${path[i]}|${path[i + 1]}`)
    }
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
          viewBox="0 0 1110 868"
          className="w-full min-w-[760px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
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
            const isActive   = activeEdgeSet.has(key)
            const isDone     = activeEdgeSet.has(doneKey)
            const isOptional = OPTIONAL_EDGES.has(key)

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
                strokeWidth={isActive ? 3 : isDone ? 2 : 1.5}
                strokeDasharray={isOptional && !isActive && !isDone ? '5 4' : undefined}
                opacity={isOptional ? 0.6 : 1}
              />
            )
          })}

          {/* ── Nodes ───────────────────────────────────────────────────── */}
          {NODES.map(node => {
            const isCurrent = node.id === currentId
            const isGoal    = node.id === goalId_node
            const isLeaf    = node.isLeaf ?? false
            const isCarrack = node.isCarrack ?? false

            const L = node.cx - NW / 2
            const T = node.y

            const cardBg  = isLeaf ? '#0d1117' : isCarrack ? '#111c2e' : '#111824'
            const stroke  = isCurrent ? '#d4a843' : isGoal ? '#3b82f6' : isCarrack ? '#1e3a5f' : '#1e2d3d'
            const strokeW = isCurrent || isGoal ? 2.5 : 1.5
            const opacity = isLeaf ? 0.4 : 1

            const iconColor = isCurrent ? '#d4a843' : isGoal ? '#60a5fa' : isCarrack ? '#2563eb' : '#374151'
            const nameColor = isCurrent ? '#fcd34d' : isGoal ? '#93c5fd' : isLeaf ? '#374151' : '#d1d5db'
            const thaiColor = isCurrent ? '#92400e' : isGoal ? '#1e40af' : '#374151'
            const descColor = isCurrent ? '#78350f' : isGoal ? '#1d4ed8' : '#1e2d3d'

            const barW    = NW - 16
            const barFill = barW * (progress / 100)

            return (
              <g key={node.id} opacity={opacity}>
                {(isCurrent || isGoal) && (
                  <rect
                    x={L - 5} y={T - 5}
                    width={NW + 10} height={NH + 10}
                    rx={15}
                    fill="none"
                    stroke={isCurrent ? '#d4a843' : '#3b82f6'}
                    strokeWidth={10}
                    opacity={0.2}
                    filter={`url(#glow-${isCurrent ? 'amber' : 'blue'})`}
                  />
                )}

                <rect x={L} y={T} width={NW} height={NH} rx={12}
                  fill={cardBg} stroke={stroke} strokeWidth={strokeW} />

                <rect x={L + 6} y={T + 6} width={NW - 12} height={IMG_H}
                  rx={8} fill={isLeaf ? 'url(#img-bg-dead)' : 'url(#img-bg)'} />

                <ShipIcon
                  cx={node.cx}
                  cy={T + 6 + IMG_H / 2 + 2}
                  size={isCarrack ? 34 : 28}
                  color={iconColor}
                />

                {loadedImages.has(node.id) && (
                  <image
                    href={getImagePath(node)}
                    x={L + 6} y={T + 6}
                    width={NW - 12} height={IMG_H}
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}

                {isGoal && (
                  <>
                    <rect x={L + 8} y={T + 6 + IMG_H + 5} width={barW} height={5} rx={2.5} fill="#1a2535" />
                    <rect x={L + 8} y={T + 6 + IMG_H + 5} width={barFill} height={5} rx={2.5} fill="#3b82f6" />
                  </>
                )}

                <text x={node.cx} y={T + IMG_H + 24}
                  textAnchor="middle" fontSize={11} fontWeight="700" fill={nameColor}>
                  {node.name}
                </text>
                <text x={node.cx} y={T + IMG_H + 38}
                  textAnchor="middle" fontSize={12} fill={thaiColor}
                  style={{ fontFamily: 'var(--font-niramit), Niramit, sans-serif' }}>
                  {node.nameTh}
                </text>
                <text x={node.cx} y={T + IMG_H + 52}
                  textAnchor="middle" fontSize={9} fill={descColor}>
                  {isCurrent ? '● You are here' : isGoal ? `▶ Goal · ${progress}%` : node.desc}
                </text>

                {isCurrent && (
                  <g>
                    <rect x={L + NW - 38} y={T + 6} width={30} height={15} rx={7.5} fill="#d4a843" />
                    <text x={L + NW - 23} y={T + 16.5} textAnchor="middle" fontSize={8} fontWeight="800" fill="#000">NOW</text>
                  </g>
                )}
                {isGoal && (
                  <g>
                    <rect x={L + NW - 42} y={T + 6} width={34} height={15} rx={7.5} fill="#3b82f6" />
                    <text x={L + NW - 25} y={T + 16.5} textAnchor="middle" fontSize={8} fontWeight="800" fill="#fff">GOAL</text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Legend */}
          <g transform="translate(0, 838)">
            <circle cx={16} cy={9} r={6} fill="#d4a843" opacity={0.8} />
            <text x={28} y={13} fontSize={10} fill="#6b7280">Current ship</text>
            <circle cx={125} cy={9} r={6} fill="#3b82f6" opacity={0.8} />
            <text x={137} y={13} fontSize={10} fill="#6b7280">Goal</text>
            <line x1={228} y1={9} x2={252} y2={9} stroke="#3b82f6" strokeWidth={2.5} />
            <text x={258} y={13} fontSize={10} fill="#6b7280">Upgrade path</text>
            <line x1={358} y1={9} x2={382} y2={9} stroke="#2d3748" strokeWidth={1.5} />
            <text x={388} y={13} fontSize={10} fill="#6b7280">Other paths</text>
            <line x1={480} y1={9} x2={504} y2={9} stroke="#2d3748" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />
            <text x={510} y={13} fontSize={10} fill="#6b7280">Optional step</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
