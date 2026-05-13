import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppLayout } from '@/components/layout/app-layout'
import { NewPipelineForm } from './new-pipeline-form'

const ALLOWED = ['admin', 'social_media', 'traffic_manager']

export default async function NewAdminPipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !ALLOWED.includes(profile.role)) redirect('/admin/pipeline')

  const { data: staff } = await admin
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['admin', 'social_media', 'traffic_manager'])
    .eq('active', true)
    .order('full_name')

  return (
    <AppLayout pageTitle="Novo Pipeline">
      <div className="max-w-2xl">
        <div className="mb-6">
          <p className="text-xs text-white/30 mb-1">
            <Link href="/admin/pipeline" className="hover:text-white/60 transition-colors">Pipelines</Link>
            <span className="mx-1.5">›</span>
            <span className="text-white/50">Novo</span>
          </p>
          <h1 className="text-xl font-bold text-white">Criar Pipeline</h1>
          <p className="text-white/40 text-sm mt-0.5">Configure um novo funil de vendas.</p>
        </div>
        <NewPipelineForm staff={staff ?? []} currentUserId={user.id} cancelHref="/admin/pipeline" />
      </div>
    </AppLayout>
  )
}
