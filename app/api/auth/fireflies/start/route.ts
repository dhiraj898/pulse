import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFirefliesAuthUrl } from '@/lib/fireflies/oauth'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64url')
  const url = getFirefliesAuthUrl(state)

  return Response.redirect(url)
}
