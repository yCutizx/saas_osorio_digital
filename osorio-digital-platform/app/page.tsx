import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ROLE_REDIRECTS: Record<string, string> = {
  admin:           '/admin/dashboard',
  traffic_manager: '/traffic/dashboard',
  social_media:    '/social/dashboard',
  client:          '/client/home',
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(ROLE_REDIRECTS[profile?.role ?? ''] ?? '/login')
}
