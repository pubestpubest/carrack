import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OWNER_EMAIL = 'pubest12@gmail.com'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId  = parseInt(id)
  if (isNaN(itemId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const patch: {
    name_th?:         string | null
    grade?:           string
    image_url?:       string | null
    crow_coin_price?: number | null
    category?:        string
    tier?:            number
  } = {}

  if ('name_th'         in body) patch.name_th         = body.name_th         ?? null
  if ('grade'           in body) patch.grade           = body.grade
  if ('image_url'       in body) patch.image_url       = body.image_url       ?? null
  if ('crow_coin_price' in body) patch.crow_coin_price = body.crow_coin_price ?? null
  if ('category'        in body) patch.category        = body.category
  if ('tier'            in body) patch.tier            = body.tier

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('items').update(patch).eq('item_id', itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
