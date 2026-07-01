import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { ProjectBoard } from '@/components/pipeline/project-board'
import { FolderOpen } from 'lucide-react'

export default async function ClientPipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') {
    redirect('/admin/dashboard')
  }

  // Resolve o cliente real do usuário via client_assignments (mesmo padrão de
  // finance/ads/instagram). pipeline_projects.client_id guarda o clients.id,
  // NÃO o auth uid — por isso filtrar por user.id direto retorna vazio.
  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  const clientId = assignment?.client_id

  // Sem vínculo de cliente: estado vazio (fail-closed — sem dados, não erro).
  if (!clientId) {
    return (
      <AppLayout pageTitle="Meus Projetos">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">Nenhum projeto disponível no momento.</p>
        </div>
      </AppLayout>
    )
  }

  const admin = createAdminClient()

  const { data: projects } = await admin
    .from('pipeline_projects')
    .select('id, name, description, stage, value, start_date, end_date, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  // For each project, fetch deliverables
  const projectsWithDeliverables = await Promise.all(
    (projects ?? []).map(async (project) => {
      const { data: deliverables } = await admin
        .from('pipeline_deliverables')
        .select('id, project_id, name, description, status, due_date, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })
      return { ...project, deliverables: deliverables ?? [] }
    })
  )

  const STAGE_COLORS: Record<string, string> = {
    'A Fazer':       '#3B82F6',
    'Em Andamento':  '#F59E0B',
    'Em Revisão':    '#8B5CF6',
    'Concluído':     '#22C55E',
  }

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))

  return (
    <AppLayout pageTitle="Meus Projetos">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#EACE00]" />
            Meus Projetos
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Acompanhe o progresso dos seus projetos</p>
        </div>

        {projectsWithDeliverables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Nenhum projeto disponível no momento.</p>
          </div>
        ) : (
          projectsWithDeliverables.map((project) => {
            const stageColor = STAGE_COLORS[project.stage] ?? '#6B7280'
            return (
              <div key={project.id} className="space-y-4">
                {/* Project Header */}
                <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-white font-bold text-base">{project.name}</h2>
                      {project.description && (
                        <p className="text-[#888] text-sm mt-0.5">{project.description}</p>
                      )}
                    </div>
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium shrink-0"
                      style={{ background: stageColor + '22', color: stageColor }}
                    >
                      {project.stage}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1a1a1a]">
                    {project.value != null && (
                      <span className="text-[#EACE00] text-sm font-semibold">
                        {fmtCurrency(project.value)}
                      </span>
                    )}
                    {project.start_date && (
                      <span className="text-[#555] text-xs">
                        Início: {fmtDate(project.start_date)}
                      </span>
                    )}
                    {project.end_date && (
                      <span className="text-[#555] text-xs">
                        Prazo: {fmtDate(project.end_date)}
                      </span>
                    )}
                    <span className="text-[#555] text-xs">
                      {project.deliverables.length} entrega{project.deliverables.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Deliverables Board (read-only) */}
                <ProjectBoard
                  deliverables={project.deliverables}
                  projectId={project.id}
                  readOnly={true}
                />
              </div>
            )
          })
        )}
      </div>
    </AppLayout>
  )
}
