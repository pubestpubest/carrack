'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ShipStage   = { stage_id: number; ship_name: string; stage_order: number; variant: string }
type CarrackItem = { item_id: number; name: string; name_th: string | null; grade: string; tier: number; category: string }
type EquipItem   = { item_id: number; name: string; name_th: string | null; grade: string; image_url: string | null }

const CARRACK_DESCRIPTIONS: Record<string, { focus: string; detail: string }> = {
  advance:  { focus: 'Cargo / Barter',   detail: 'Max inventory & weight limit — best for bartering' },
  balance:  { focus: 'All-rounder',      detail: 'Balanced stats across all categories' },
  valor:    { focus: 'Combat',           detail: 'Highest cannon damage & fire rate' },
  volante:  { focus: 'Speed',            detail: 'Fastest travel speed on the sea' },
}

// Which current-ship variants are valid starting points for a given target ship.
// Progression: none → base hull → modified hull → T3 ship → Carrack.
function allowedCurrentVariants(name: string): string[] {
  const n     = name.toLowerCase()
  const gline = /frigate|galleass|valor|volante/.test(n)
  const t2    = gline ? 'frigate' : 'sailboat'
  const t2mod = gline ? 'frigate_modified' : 'sailboat_modified'
  const t3    = gline ? 'galleass' : 'caravel'
  if (/advance|balance|valor|volante/.test(n)) return ['none', t2, t2mod, t3] // T4 Carrack
  if ((n.includes('caravel') || n.includes('galleass')))  return ['none', t2, t2mod] // T3
  if (n.includes('modified'))                              return ['none', t2] // T2.5 modified hull
  return ['none'] // T2 base hull
}

// Display order for the current-ship picker (lower = earlier in the build path).
const VARIANT_RANK: Record<string, number> = {
  none: 0, sailboat: 1, frigate: 1, sailboat_modified: 2, frigate_modified: 2, caravel: 3, galleass: 3,
}

const GRADE_BG: Record<string, string> = {
  white:  '#1f2937',
  green:  '#14290d',
  blue:   '#0c1a2e',
  yellow: '#2a1f00',
  orange: '#2a1000',
  red:    '#2a0a0a',
}

function NewGoalContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const initialType = searchParams.get('type') === 'equipment' ? ('equipment' as const) : null

  const [goalType,      setGoalType]      = useState<'ship' | 'equipment' | null>(initialType)

  // Ship goal state
  const [stages,        setStages]        = useState<ShipStage[]>([])
  const [carracks,      setCarracks]      = useState<CarrackItem[]>([])
  const [step,          setStep]          = useState<1 | 2>(1)
  const [target,        setTarget]        = useState<CarrackItem | null>(null)
  const [currentStage,  setCurrentStage]  = useState<ShipStage | null>(null)

  // Equipment goal state
  const [equipItems,    setEquipItems]    = useState<EquipItem[]>([])
  const [selectedEquip, setSelectedEquip] = useState<EquipItem | null>(null)
  const [equipQty,      setEquipQty]      = useState(1)
  const [equipSearch,   setEquipSearch]   = useState('')

  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (goalType !== 'ship') return
    const supabase = createClient()
    Promise.all([
      supabase.from('ship_stages').select('*').order('stage_order'),
      // Buildable ship targets: hulls (T2–T3) + Carracks (T4), all category 'ship'.
      supabase.from('items').select('item_id, name, name_th, grade, tier, category').eq('category', 'ship').gte('tier', 2),
    ]).then(([{ data: s }, { data: ships }]) => {
      setStages(s ?? [])
      const all = ((ships ?? []) as CarrackItem[]).slice()
      all.sort((a, b) => a.tier - b.tier || a.item_id - b.item_id)
      setCarracks(all)
    })
  }, [goalType])

  useEffect(() => {
    if (goalType !== 'equipment') return
    const supabase = createClient()
    supabase.from('items').select('item_id, name, name_th, grade, image_url')
      .eq('category', 'equipment')
      .order('name')
      .then(({ data }) => setEquipItems(data ?? []))
  }, [goalType])

  const variantOf = (item: CarrackItem) =>
    item.name.toLowerCase().includes('advance') ? 'advance'
      : item.name.toLowerCase().includes('balance') ? 'balance'
      : item.name.toLowerCase().includes('valor')   ? 'valor'
      : item.name.toLowerCase().includes('volante') ? 'volante'
      : ''

  const currentShipOptions: ShipStage[] = (() => {
    if (!target) return []
    const allowed = allowedCurrentVariants(target.name)
    return stages
      .filter(s => allowed.includes(s.variant))
      .sort((a, b) => (VARIANT_RANK[a.variant] ?? 0) - (VARIANT_RANK[b.variant] ?? 0))
  })()

  function handleSelectTarget(item: CarrackItem) {
    setTarget(item)
    setCurrentStage(null)
    setStep(2)
  }

  async function handleCreateShipGoal() {
    if (!target || !currentStage) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error: err } = await supabase
        .from('user_goals')
        .insert({
          user_id:          user.id,
          item_id:          target.item_id,
          target_qty:       1,
          current_stage_id: currentStage.stage_id,
          use_daily_quests: false,
        })
        .select('id')
        .single()
      if (err) { setError(err.message); return }
      if (data) {
        // Make the new goal the sole active one of its type (pauses any other active same-type goal).
        await fetch(`/api/goals/${data.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: true }),
        })
        router.push(`/goals/${data.id}`)
      }
    })
  }

  async function handleCreateEquipGoal() {
    if (!selectedEquip) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error: err } = await supabase
        .from('user_goals')
        .insert({
          user_id:          user.id,
          item_id:          selectedEquip.item_id,
          target_qty:       equipQty,
          current_stage_id: null,
          use_daily_quests: false,
        })
        .select('id')
        .single()
      if (err) { setError(err.message); return }
      if (data) {
        // Make the new goal the sole active one of its type (pauses any other active same-type goal).
        await fetch(`/api/goals/${data.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: true }),
        })
        router.push(`/goals/${data.id}`)
      }
    })
  }

  const filteredEquip = equipItems.filter(item =>
    !equipSearch ||
    item.name.toLowerCase().includes(equipSearch.toLowerCase()) ||
    (item.name_th ?? '').includes(equipSearch)
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">

      {/* ── Type Selector ─────────────────────────────────────────────── */}
      {!goalType && (
        <div>
          <h1 className="mb-2 text-xl font-bold">What kind of goal?</h1>
          <p className="mb-6 text-sm text-gray-400">Choose what you'd like to track.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => setGoalType('ship')}
              data-tour="goal-type-ship"
              className="rounded-2xl border border-gray-700 bg-gray-900 p-6 text-left transition-colors hover:border-blue-500 hover:bg-gray-800"
            >
              <p className="mb-2 text-2xl">⚓</p>
              <p className="mb-1 font-semibold text-white">Ship Goal</p>
              <p className="text-xs text-gray-500">
                Track the full upgrade path to a Carrack — all materials, all stages.
              </p>
            </button>
            <button
              onClick={() => setGoalType('equipment')}
              className="rounded-2xl border border-gray-700 bg-gray-900 p-6 text-left transition-colors hover:border-blue-500 hover:bg-gray-800"
            >
              <p className="mb-2 text-2xl">⚙️</p>
              <p className="mb-1 font-semibold text-white">Equipment Goal</p>
              <p className="text-xs text-gray-500">
                Track materials for a specific equipment piece (prow, plating, cannon, etc.).
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ── Ship Goal Flow ─────────────────────────────────────────────── */}
      {goalType === 'ship' && (
        <div>
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => { setGoalType(null); setStep(1); setTarget(null) }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <StepDot n={1} active={step === 1} done={step > 1} label="Choose target ship" />
              <div className="h-px w-8 bg-gray-700" />
              <StepDot n={2} active={step === 2} done={false} label="Current progress" />
            </div>
          </div>

          {/* Step 1: Pick Carrack */}
          {step === 1 && (
            <div>
              <h1 className="mb-2 text-xl font-bold">Which ship are you building?</h1>
              <p className="mb-6 text-sm text-gray-400">
                Choose your target — any tier. The tracker shows everything needed to get there.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-tour="carrack-list">
                {carracks.map(item => {
                  const desc = CARRACK_DESCRIPTIONS[variantOf(item)]
                  return (
                    <button
                      key={item.item_id}
                      onClick={() => handleSelectTarget(item)}
                      data-tour="carrack-option"
                      className="rounded-lg border border-gray-700 bg-gray-900 p-5 text-left transition-colors hover:border-blue-500 hover:bg-gray-800"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className={`font-semibold grade-${item.grade}`}>{item.name}</p>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-600">T{item.tier}</span>
                      </div>
                      {item.name_th && <p className="mb-2 text-xs text-gray-500 font-thai">{item.name_th}</p>}
                      {desc && (
                        <>
                          <p className="text-xs font-medium text-blue-400">{desc.focus}</p>
                          <p className="text-xs text-gray-500">{desc.detail}</p>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Pick current ship */}
          {step === 2 && target && (
            <div data-tour="ship-current-step">
              <h1 className="mb-1 text-xl font-bold">What ship do you currently have?</h1>
              <p className="mb-6 text-sm text-gray-400">
                Goal: <span className="grade-blue font-medium">{target.name}</span>
              </p>
              <div className="mb-6 space-y-2">
                {currentShipOptions.map(stage => (
                  <button
                    key={stage.stage_id}
                    onClick={() => setCurrentStage(stage)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      currentStage?.stage_id === stage.stage_id
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {stage.variant === 'none' ? '🚢 ' : ''}{stage.ship_name}
                      </p>
                      {stage.variant !== 'none' && (
                        <p className="text-xs text-gray-500">
                          {stage.stage_order === 1 ? 'Base ship' : 'Intermediate ship'}
                        </p>
                      )}
                    </div>
                    {currentStage?.stage_id === stage.stage_id && (
                      <span className="text-sm text-blue-400">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleCreateShipGoal}
                  disabled={!currentStage || isPending}
                  data-tour="start-tracking"
                  className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40"
                >
                  {isPending ? 'Creating…' : 'Start Tracking'}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="rounded border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Equipment Goal Flow ─────────────────────────────────────────── */}
      {goalType === 'equipment' && (
        <div>
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => { setGoalType(null); setSelectedEquip(null); setEquipSearch('') }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">Pick equipment to track</h1>
          </div>

          <input
            type="text"
            placeholder="Search equipment…"
            value={equipSearch}
            onChange={e => setEquipSearch(e.target.value)}
            className="mb-3 w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
          />

          <div className="mb-5 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-3">
            {equipItems.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-600">Loading…</p>
            )}
            {equipItems.length > 0 && filteredEquip.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-600">No equipment found.</p>
            )}
            {filteredEquip.map(item => (
              <button
                key={item.item_id}
                onClick={() => setSelectedEquip(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  selectedEquip?.item_id === item.item_id
                    ? 'border border-blue-500/50 bg-blue-900/40'
                    : 'border border-transparent hover:bg-gray-800'
                }`}
              >
                <div
                  className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border grade-frame-${item.grade}`}
                  style={{ backgroundColor: GRADE_BG[item.grade] ?? '#1f2937' }}
                >
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium grade-${item.grade} leading-snug`}>{item.name_th ?? item.name}</p>
                  <p className="text-xs text-gray-600 leading-snug">{item.name}</p>
                </div>
                {selectedEquip?.item_id === item.item_id && (
                  <span className="shrink-0 text-sm text-blue-400">✓</span>
                )}
              </button>
            ))}
          </div>

          {selectedEquip && (
            <div className="mb-5 rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
              <p className="mb-3 text-sm font-medium text-gray-300">
                Selected:{' '}
                <span className={`grade-${selectedEquip.grade}`}>{selectedEquip.name}</span>
              </p>
              <label className="flex items-center gap-3 text-sm text-gray-400">
                <span>Target quantity:</span>
                <input
                  type="number"
                  min={1}
                  value={equipQty}
                  onChange={e => setEquipQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-center text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>
          )}

          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          <button
            onClick={handleCreateEquipGoal}
            disabled={!selectedEquip || isPending}
            className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40"
          >
            {isPending ? 'Creating…' : 'Track Equipment'}
          </button>
        </div>
      )}
    </div>
  )
}

function StepDot({
  n,
  active,
  done,
  label,
}: {
  n: number
  active: boolean
  done: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          done   ? 'bg-green-600 text-white' :
          active ? 'bg-blue-600 text-white'  :
                   'bg-gray-700 text-gray-400'
        }`}
      >
        {done ? '✓' : n}
      </div>
      <span className={`text-xs ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
    </div>
  )
}

export default function NewGoalPage() {
  return (
    <Suspense>
      <NewGoalContent />
    </Suspense>
  )
}
