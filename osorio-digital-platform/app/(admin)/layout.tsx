import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Rede de BORDA do grupo (admin): bloqueia o role EXTERNO 'client' de qualquer
// rota /admin/**. Permite os roles internos que legitimamente navegam aqui
// (traffic_manager/social_media usam /admin/insights e /admin/research). As
// páginas admin-only mantêm o próprio guard de admin (defesa em profundidade).
const STAFF_ROLES = ['admin', 'traffic_manager', 'social_media']

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fail-CLOSED: erro/ausência de profile ou role não-staff = acesso negado.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile || !STAFF_ROLES.includes(profile.role)) {
    redirect(profile?.role === 'client' ? '/client/home' : '/login')
  }

  return <>{children}</>
}
