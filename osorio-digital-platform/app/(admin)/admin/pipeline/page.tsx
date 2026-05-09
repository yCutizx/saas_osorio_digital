import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'

export default async function AdminPipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'social_media'].includes(profile.role)) {
    redirect('/admin/dashboard')
  }

  const admin = createAdminClient()

  const { data: stages } = await admin
    .from('pipeline_stages_agency')
    .select('id, name, order, color')
    .order('order', { ascending: true })

  const { data: leads } = await admin
    .from('pipeline_leads')
    .select('*, responsible:profiles!pipeline_leads_responsible_id_fkey(id, full_name)')
    .order('created_at', { ascending: false })

  const { data: members } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'social_media'])
    .order('full_name', { ascending: true })

  // Find leads with overdue activities (done=false and scheduled_at < now)
  const { data: overdueActivities } = await admin
    .from('pipeline_activities')
    .select('lead_id')
    .eq('done', false)
    .lt('scheduled_at', new Date().toISOString())

  const overdueLeadIds = Array.from(new Set((overdueActivities ?? []).map((a: { lead_id: string }) => a.lead_id)))

  return (
    <AppLayout pageTitle="Pipeline">
      <PipelineBoard
        stages={stages ?? []}
        leads={(leads ?? []) as Parameters<typeof PipelineBoard>[0]['leads']}
        members={members ?? []}
        overdueLeadIds={overdueLeadIds}
        dashboardHref="/admin/pipeline/dashboard"
      />
    </AppLayout>
  )
}
