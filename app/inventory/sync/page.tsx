import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InventorySync from './sync-client'

// Full reconcile from a screenshot: scan overwrites qty_have (SET) for detected
// items only — unseen items are left untouched. Distinct from the gather session.
export default async function InventorySyncPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: items }, { data: inventory }] = await Promise.all([
    supabase.from('items').select('item_id, name, name_th, grade, category, image_url').order('name'),
    supabase.from('user_inventory').select('item_id, qty_have').eq('user_id', user.id),
  ])

  const invMap = new Map((inventory ?? []).map(i => [i.item_id, i.qty_have]))
  const catalogue = (items ?? []).map(it => ({ ...it, qty_have: invMap.get(it.item_id) ?? 0 }))

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <InventorySync catalogue={catalogue} />
    </div>
  )
}
