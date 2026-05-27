import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { CommercialTabs } from './tabs'

export default async function CommercialLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  return (
    <AppLayout pageTitle="Comercial">
      <div className="space-y-6">
        <CommercialTabs />
        {children}
      </div>
    </AppLayout>
  )
}

export const dynamic = 'force-dynamic'
