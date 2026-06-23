import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BarterHold, { type BarterRow } from './barter-grid'

export const metadata = { title: 'Barter Hold · Carrack Tracker' }

export default async function BarterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: items }, { data: inventory }, { data: thresholds }] = await Promise.all([
    supabase
      .from('items')
      .select('item_id, name, name_th, grade, tier, image_url')
      .eq('category', 'barter')
      .order('tier')
      .order('name'),
    supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
    supabase.from('user_barter_thresholds').select('tier, crit, warn').eq('user_id', user.id),
  ])

  const invMap = new Map((inventory ?? []).map(i => [i.item_id, i.qty_have]))
  const rows: BarterRow[] = (items ?? []).map(it => ({
    item_id:  it.item_id,
    name:     it.name,
    name_th:  it.name_th,
    grade:    it.grade,
    tier:     it.tier,
    image_url: it.image_url,
    qty_have: invMap.get(it.item_id) ?? 0,
  }))

  return <BarterHold rows={rows} thresholds={thresholds ?? []} />
}
