import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { ProjectBoard } from '@/components/pipeline/project-board'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, User } from 'lucide-react'
import { ProjectStageSelector } from '@/app/(admin)/admin/pipeline/projects/[id]/project-stage-selector'

const STAGE_COLORS: Record<string, string> = {
  'A Fazer':       '#3B82F6',
  'Em Andamento':  '#F59E0B',
  'Em Revisão':    '#8B5CF6',
  'Concluído':     '#22C55E',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SocialProjectDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'social_media'].includes(profile.role)) {
    redirect('/social/dashboard')
  }

  const admin = createAdminClient()

  const { data: project } = await admin
    .from('pipeline_projects')
    .select('*, client:profiles!pipeline_projects_client_id_fkey(id, full_name, email), responsible:profiles!pipeline_projects_responsible_id_fkey(id, full_name)')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: deliverables } = await admin
    .from('pipeline_deliverables')
    .select('id, project_id, name, description, status, due_date, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  const { data: projectStages } = await admin
    .from('pipeline_project_stages')
    .select('id, name, order, color')
    .order('order', { ascending: true })

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = project.client as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responsible = project.responsible as any
  const stageColor = STAGE_COLORS[project.stage] ?? '#6B7280'

  return (
    <AppLayout pageTitle={project.name}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/social/pipeline/projects"
                className="text-[#888] hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-[#888] text-sm">{project.description}</p>
            )}
          </div>
          <ProjectStageSelector
            projectId={project.id}
            currentStage={project.stage}
            stages={projectStages ?? []}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111] border border-[#222] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-[#888]" />
              <span className="text-[#888] text-xs">Cliente</span>
            </div>
            <p className="text-white text-sm font-medium">{client?.full_name ?? '—'}</p>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-[#888]" />
              <span className="text-[#888] text-xs">Responsável</span>
            </div>
            <p className="text-white text-sm font-medium">{responsible?.full_name ?? '—'}</p>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-[#888]" />
              <span className="text-[#888] text-xs">Valor</span>
            </div>
            <p className="text-[#EACE00] text-sm font-semibold">
              {project.value != null ? fmtCurrency(project.value) : '—'}
            </p>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5 text-[#888]" />
              <span className="text-[#888] text-xs">Prazo</span>
            </div>
            <p className="text-white text-sm font-medium">
              {project.end_date ? fmtDate(project.end_date) : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-sm px-3 py-1 rounded-full font-semibold"
            style={{ background: stageColor + '22', color: stageColor }}
          >
            {project.stage}
          </span>
          <span className="text-[#555] text-sm">
            {deliverables?.length ?? 0} entrega{(deliverables?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        <ProjectBoard
          deliverables={deliverables ?? []}
          projectId={project.id}
          readOnly={false}
        />
      </div>
    </AppLayout>
  )
}
