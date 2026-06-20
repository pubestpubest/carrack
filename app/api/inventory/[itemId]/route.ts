import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/types/database'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params
  const itemIdNum  = parseInt(itemId)
  if (isNaN(itemIdNum)) return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })

  const body = await request.json()
  const qty: unknown = body?.qty
  if (typeof qty !== 'number' || qty < 0) {
    return NextResponse.json({ error: 'qty must be a non-negative number' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get current qty for audit delta
  const { data: prev } = await supabase
    .from('user_inventory')
    .select('qty_have')
    .eq('user_id', user.id)
    .eq('item_id', itemIdNum)
    .maybeSingle()

  const prevQty = (prev as { qty_have: number } | null)?.qty_have ?? 0

  const upsertRow: TablesInsert<'user_inventory'> = { user_id: user.id, item_id: itemIdNum, qty_have: qty as number }
  const { error: upsertError } = await supabase
    .from('user_inventory')
    .upsert(upsertRow, { onConflict: 'user_id,item_id' })

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  const delta = (qty as number) - prevQty
  if (delta !== 0) {
    const logRow: TablesInsert<'inventory_log'> = {
      user_id: user.id,
      item_id: itemIdNum,
      delta,
      reason: 'manual update',
    }
    await supabase.from('inventory_log').insert(logRow)
  }

  return NextResponse.json({ ok: true })
}
