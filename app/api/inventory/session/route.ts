import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/types/database'

type SessionItem = { item_id: number; delta: number }

// Batch "gathering session" save — increments many items at once.
// Each item's qty becomes (current qty + delta); logged with reason 'gathering session'.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const rawItems: unknown = body?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 })
  }

  const items: SessionItem[] = []
  for (const r of rawItems) {
    const item_id = (r as { item_id?: unknown })?.item_id
    const delta   = (r as { delta?: unknown })?.delta
    if (typeof item_id !== 'number' || typeof delta !== 'number' || !Number.isFinite(delta)) {
      return NextResponse.json({ error: 'each item needs numeric item_id and delta' }, { status: 400 })
    }
    if (delta !== 0) items.push({ item_id, delta: Math.round(delta) })
  }
  if (items.length === 0) {
    return NextResponse.json({ error: 'no non-zero deltas to apply' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const itemIds = items.map(i => i.item_id)

  // Read current quantities in one query to compute new absolute values.
  const { data: existing, error: readErr } = await supabase
    .from('user_inventory')
    .select('item_id, qty_have')
    .eq('user_id', user.id)
    .in('item_id', itemIds)

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

  const prevMap = new Map((existing ?? []).map(r => [r.item_id, r.qty_have]))

  const upsertRows: TablesInsert<'user_inventory'>[] = items.map(({ item_id, delta }) => ({
    user_id:  user.id,
    item_id,
    qty_have: Math.max(0, (prevMap.get(item_id) ?? 0) + delta),
  }))

  const { error: upsertErr } = await supabase
    .from('user_inventory')
    .upsert(upsertRows, { onConflict: 'user_id,item_id' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  const logRows: TablesInsert<'inventory_log'>[] = items.map(({ item_id, delta }) => ({
    user_id: user.id,
    item_id,
    delta,
    reason: 'gathering session',
  }))
  await supabase.from('inventory_log').insert(logRows)

  return NextResponse.json({ ok: true, count: items.length })
}
