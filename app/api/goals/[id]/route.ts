import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TablesUpdate } from '@/lib/types/database'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const goalId = parseInt(id)
  if (isNaN(goalId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('user_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Pause/resume a goal. Activating one auto-pauses any other active goal of the
// same type (ship = has current_stage_id, equipment = doesn't), so at most one
// of each type is active at a time.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const goalId = parseInt(id)
  if (isNaN(goalId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { is_active } = await request.json()
  const isActive = !!is_active

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: goal } = await supabase
    .from('user_goals')
    .select('id, current_stage_id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  if (isActive) {
    // Pause the currently-active goal of the same type before activating this one.
    const isShip = goal.current_stage_id != null
    let q = supabase
      .from('user_goals')
      .update({ is_active: false } as TablesUpdate<'user_goals'>)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .neq('id', goalId)
    q = isShip ? q.not('current_stage_id', 'is', null) : q.is('current_stage_id', null)
    const { error: pauseErr } = await q
    if (pauseErr) return NextResponse.json({ error: pauseErr.message }, { status: 500 })
  }

  const { error } = await supabase
    .from('user_goals')
    .update({ is_active: isActive } as TablesUpdate<'user_goals'>)
    .eq('id', goalId)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
