import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShellLayout } from './shell-layout'
import { type UserRole } from '@/types'

interface AppLayoutProps {
  children:   React.ReactNode
  pageTitle?: string
}

export async function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url, email')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  let clientPlan: string | null = null
  if (profile.role === 'client') {
    const { data: assignment } = await supabase
      .from('client_assignments')
      .select('clients(plan)')
      .eq('user_id', user.id)
      .eq('role', 'client')
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientPlan = (assignment?.clients as any)?.plan ?? 'basico'
  }

  return (
    <ShellLayout
      role={profile.role as UserRole}
      userName={profile.full_name ?? profile.email}
      userEmail={profile.email}
      avatarUrl={profile.avatar_url}
      pageTitle={pageTitle}
      clientPlan={clientPlan}
    >
      {children}
    </ShellLayout>
  )
}
