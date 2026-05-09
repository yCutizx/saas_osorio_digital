import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import Link from 'next/link'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import { ProjectsClient } from './projects-client'

export default async function AdminPipelineProjectsPage() {
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

  const { data: projects } = await admin
    .from('pipeline_projects')
    .select('*, client:profiles!pipeline_projects_client_id_fkey(id, full_name, email), responsible:profiles!pipeline_projects_responsible_id_fkey(id, full_name)')
    .order('created_at', { ascending: false })

  const { data: clients } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'client')
    .order('full_name', { ascending: true })

  const { data: members } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('role', ['admin', 'social_media'])
    .order('full_name', { ascending: true })

  const { data: projectStages } = await admin
    .from('pipeline_project_stages')
    .select('id, name, order, color')
    .order('order', { ascending: true })

  return (
    <AppLayout pageTitle="Projetos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-[#EACE00]" />
              Projetos
            </h1>
            <p className="text-white/40 text-sm mt-0.5">Gerencie os projetos dos clientes</p>
          </div>
          <Link
            href="/admin/pipeline"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#333] text-white/50 text-sm hover:text-white hover:border-[#555] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Pipeline
          </Link>
        </div>

        <ProjectsClient
          projects={(projects ?? []) as Parameters<typeof ProjectsClient>[0]['projects']}
          clients={clients ?? []}
          members={members ?? []}
          projectStages={projectStages ?? []}
          projectsPageHref="/admin/pipeline/projects"
        />
      </div>
    </AppLayout>
  )
}
