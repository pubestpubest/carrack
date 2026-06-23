import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Link
          href="/inventory/sync"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold font-thai transition-colors hover:bg-gray-900/40"
          style={{ borderColor: 'var(--brass-dim)', color: 'var(--brass-light)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          ซิงค์จากภาพ
        </Link>
      </div>
      <InventoryBento items={merged} />
    </div>
  )
}
