import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminTable from './admin-table'

const OWNER_EMAIL = 'pubest12@gmail.com'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (user.email !== OWNER_EMAIL) redirect('/')

  const { data: items } = await supabase
    .from('items')
    .select('item_id, name, name_th, grade, category, tier, image_url, crow_coin_price')
    .order('category')
    .order('name')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rose-400">Item Admin</h1>
        <p className="mt-1 text-sm text-gray-500">{items?.length ?? 0} items · owner only</p>
      </div>
      <AdminTable items={items ?? []} />
    </div>
  )
}
