import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppLayout } from '@/components/layout/app-layout'
import { SettingsForm } from '@/app/(admin)/admin/pipeline/[id]/settings/settings-form'
import { StagesEditor } from '@/app/(admin)/admin/pipeline/[id]/settings/stages-editor'
import { TagsEditor } from '@/app/(admin)/admin/pipeline/[id]/settings/tags-editor'
import { WebhookSection } from '@/app/(admin)/admin/pipeline/[id]/settings/webhook-section'
import type { PipelineStage, PipelineTag } from '@/types'

const ALLOWED = ['admin', 'social_media', 'traffic_manager']

interface PageProps { params: Promise<{ id: string }> }

export default async function TrafficPipelineSettingsPage({ params }: PageProps) {
  const { id: pipelineId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !ALLOWED.includes(profile.role)) redirect('/traffic/dashboard')

  const { data: pipeline } = await admin
    .from('pipelines')
    .select('id, name, description, color, webhook_token, created_by')
    .eq('id', pipelineId)
    .maybeSingle()
  if (!pipeline) notFound()

  const { data: memberRows } = await admin
    .from('pipeline_members')
    .select('profile_id')
    .eq('pipeline_id', pipelineId)
  const memberIds = (memberRows ?? []).map((m) => m.profile_id)

  const isAdmin   = profile.role === 'admin'
  const isCreator = pipeline.created_by === user.id
  const isMember  = memberIds.includes(user.id)
  if (!isAdmin && !isCreator && !isMember) redirect('/traffic/pipeline')

  const [{ data: staff }, { data: stages }, { data: tags }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'social_media', 'traffic_manager']).eq('active', true).order('full_name'),
    admin.from('pipeline_stages_agency').select('id, pipeline_id, name, order, color').eq('pipeline_id', pipelineId).order('order'),
    admin.from('pipeline_tags').select('id, pipeline_id, name, color').eq('pipeline_id', pipelineId).order('name'),
  ])

  return (
    <AppLayout pageTitle={`Configurações — ${pipeline.name}`}>
      <div className="max-w-3xl space-y-10">
        <div>
          <p className="text-xs text-white/30 mb-1">
            <Link href="/traffic/pipeline" className="hover:text-white/60 transition-colors">Pipelines</Link>
            <span className="mx-1.5">›</span>
            <Link href={`/traffic/pipeline/${pipeline.id}`} className="hover:text-white/60 transition-colors">{pipeline.name}</Link>
            <span className="mx-1.5">›</span>
            <span className="text-white/50">Configurações</span>
          </p>
          <h1 className="text-xl font-bold text-white">Configurações do Pipeline</h1>
        </div>

        <section>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Geral & Membros</h2>
          <SettingsForm pipelineId={pipeline.id} initialName={pipeline.name} initialDescription={pipeline.description} initialColor={pipeline.color} initialMemberIds={memberIds} staff={staff ?? []} currentUserId={user.id} />
        </section>

        <div className="border-t border-[#222]" />

        <section>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Etapas do funil</h2>
          <StagesEditor pipelineId={pipeline.id} initialStages={(stages ?? []) as PipelineStage[]} />
        </section>

        <div className="border-t border-[#222]" />

        <section>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Tags</h2>
          <TagsEditor pipelineId={pipeline.id} tags={(tags ?? []) as PipelineTag[]} />
        </section>

        <div className="border-t border-[#222]" />

        <section>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Webhook de entrada</h2>
          <WebhookSection pipelineId={pipeline.id} webhookToken={pipeline.webhook_token} />
        </section>
      </div>
    </AppLayout>
  )
}
