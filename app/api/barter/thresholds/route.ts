import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/types/database'

// Upsert one tier's stock-health thresholds for the current user.
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const tier = Number(body?.tier)
  const crit = Number(body?.crit)
  const warn = Number(body?.warn)

  if (!Number.isInteger(tier) || tier < 1 || tier > 10) {
    return NextResponse.json({ error: 'tier must be an integer 1–10' }, { status: 400 })
  }
  if (!Number.isFinite(crit) || !Number.isFinite(warn) || crit < 0 || warn < 0) {
    return NextResponse.json({ error: 'crit/warn must be non-negative numbers' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Keep green threshold at or above the red threshold.
  const row: TablesInsert<'user_barter_thresholds'> = {
    user_id: user.id,
    tier,
    crit: Math.floor(crit),
    warn: Math.max(Math.floor(warn), Math.floor(crit)),
  }

  const { error } = await supabase
    .from('user_barter_thresholds')
    .upsert(row, { onConflict: 'user_id,tier' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...row })
}
