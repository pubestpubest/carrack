import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database'
import InventoryBento from './inventory-table'

type MergedItem = Tables<'items'> & { qty_have: number }

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: items }, { data: inventory }] = await Promise.all([
    supabase.from('items').select('item_id, name, name_th, grade, category, tier, image_url, crow_coin_price').order('tier').order('name'),
    supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
  ])

  const invMap = new Map((inventory ?? []).map(i => [i.item_id, i.qty_have]))
  const merged: MergedItem[] = (items ?? []).map(item => ({
    ...item,
    qty_have: invMap.get(item.item_id) ?? 0,
  }))

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold">Inventory</h1>
      <InventoryBento items={merged} />
    </div>
  )
}
