import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadReferences, scanImage, type ItemMeta } from '@/lib/vision/scan'

export const runtime = 'nodejs' // sharp needs the Node runtime
export const maxDuration = 30

// Read an inventory screenshot and return matched item candidates for review.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('image')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'image file required' }, { status: 400 })
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'image too large (max 8MB)' }, { status: 413 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  const { data: items, error } = await supabase
    .from('items')
    .select('item_id, name, name_th, grade, image_url')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const refs = await loadReferences((items ?? []) as ItemMeta[])
  try {
    const result = await scanImage(buf, refs)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'could not read the image' }, { status: 422 })
  }
}
