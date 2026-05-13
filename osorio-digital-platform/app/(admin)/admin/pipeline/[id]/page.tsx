import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppLayout } from '@/components/layout/app-layout'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import type {
  Lead, PipelineActivity, PipelineStage, PipelineTag,
  LeadTimelineEvent, LeadAttachment, LeadTimelineEventType,
} from '@/types'

const ALLOWED = ['admin', 'social_media', 'traffic_manager']

interface PageProps {
  params: Promise<{ id: string }>
}

type RawTagRow = { tag: PipelineTag | PipelineTag[] | null }

export default async function AdminPipelineBoardPage({ params }: PageProps) {
  const { id: pipelineId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !ALLOWED.includes(profile.role)) redirect('/admin/dashboard')

  const { data: pipeline } = await admin
    .from('pipelines')
    .select('id, name, description, color, created_by')
    .eq('id', pipelineId)
    .maybeSingle()

  if (!pipeline) notFound()

  if (profile.role !== 'admin' && pipeline.created_by !== user.id) {
    const { data: member } = await admin
      .from('pipeline_members')
      .select('pipeline_id')
      .eq('pipeline_id', pipelineId)
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!member) redirect('/admin/pipeline')
  }

  const [
    { data: stages },
    { data: rawLeads },
    { data: tags },
    { data: memberRows },
    { data: overdueActivities },
  ] = await Promise.all([
    admin
      .from('pipeline_stages_agency')
      .select('id, pipeline_id, name, order, color')
      .eq('pipeline_id', pipelineId)
      .order('order', { ascending: true }),
    admin
      .from('pipeline_leads')
      .select('*, responsible:profiles!pipeline_leads_responsible_id_fkey(id, full_name, email), pipeline_lead_tags(tag_id, tag:pipeline_tags(id, pipeline_id, name, color))')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true }),
    admin
      .from('pipeline_tags')
      .select('id, pipeline_id, name, color')
      .eq('pipeline_id', pipelineId)
      .order('name'),
    admin
      .from('pipeline_members')
      .select('profile:profiles!pipeline_members_profile_id_fkey(id, full_name, email)')
      .eq('pipeline_id', pipelineId),
    admin
      .from('pipeline_activities')
      .select('lead_id')
      .eq('done', false)
      .lt('scheduled_at', new Date().toISOString()),
  ])

  const leadIds = (rawLeads ?? []).map((l) => l.id as string)

  const [
    { data: activitiesRaw },
    { data: attachmentsRaw },
    { data: timelineRaw },
  ] = leadIds.length === 0
    ? [{ data: [] }, { data: [] }, { data: [] }]
    : await Promise.all([
        admin
          .from('pipeline_activities')
          .select('id, lead_id, user_id, type, description, scheduled_at, done, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false }),
        admin
          .from('pipeline_lead_attachments')
          .select('id, lead_id, file_name, file_url, file_size, uploaded_by, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false }),
        admin
          .from('pipeline_lead_timeline')
          .select('id, lead_id, user_id, event_type, event_data, created_at, user:profiles!pipeline_lead_timeline_user_id_fkey(full_name, email)')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false }),
      ])

  const overdueLeadIds = Array.from(new Set((overdueActivities ?? []).map((a: { lead_id: string }) => a.lead_id)))

  const activitiesByLead: Record<string, PipelineActivity[]> = {}
  for (const a of (activitiesRaw ?? []) as PipelineActivity[]) {
    if (!activitiesByLead[a.lead_id]) activitiesByLead[a.lead_id] = []
    activitiesByLead[a.lead_id].push(a)
  }

  const attachmentsByLead: Record<string, LeadAttachment[]> = {}
  for (const a of (attachmentsRaw ?? []) as LeadAttachment[]) {
    if (!attachmentsByLead[a.lead_id]) attachmentsByLead[a.lead_id] = []
    attachmentsByLead[a.lead_id].push(a)
  }

  const timelineByLead: Record<string, LeadTimelineEvent[]> = {}
  for (const ev of (timelineRaw ?? []) as Array<{
    id: string; lead_id: string; user_id: string | null; event_type: string
    event_data: Record<string, unknown>; created_at: string
    user: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
  }>) {
    if (!timelineByLead[ev.lead_id]) timelineByLead[ev.lead_id] = []
    const userObj = Array.isArray(ev.user) ? ev.user[0] ?? null : ev.user
    timelineByLead[ev.lead_id].push({
      id: ev.id,
      lead_id: ev.lead_id,
      user_id: ev.user_id,
      event_type: ev.event_type as LeadTimelineEventType,
      event_data: ev.event_data,
      created_at: ev.created_at,
      user: userObj,
    })
  }

  type LeadRow = Lead & { pipeline_lead_tags?: RawTagRow[] | null; responsible?: Lead['responsible'] | Lead['responsible'][] }
  const leads: Lead[] = ((rawLeads ?? []) as LeadRow[]).map((l) => {
    const tagRows = l.pipeline_lead_tags ?? []
    const leadTags: PipelineTag[] = tagRows
      .map((r) => Array.isArray(r.tag) ? r.tag[0] : r.tag)
      .filter((t): t is PipelineTag => !!t)
    const resp = Array.isArray(l.responsible) ? l.responsible[0] ?? null : l.responsible ?? null
    return {
      id: l.id,
      pipeline_id: l.pipeline_id,
      name: l.name,
      company: l.company,
      email: l.email,
      phone: l.phone,
      whatsapp: l.whatsapp,
      role: l.role,
      source: l.source,
      estimated_value: l.estimated_value,
      expected_close_date: l.expected_close_date,
      probability: l.probability,
      stage: l.stage,
      position: l.position ?? 0,
      notes: l.notes,
      lost_reason: l.lost_reason,
      lost_reason_other: l.lost_reason_other,
      responsible_id: l.responsible_id,
      created_at: l.created_at,
      updated_at: l.updated_at,
      responsible: resp,
      tags: leadTags,
    }
  })

  const members = ((memberRows ?? []) as Array<{ profile: { id: string; full_name: string | null; email: string } | { id: string; full_name: string | null; email: string }[] | null }>)
    .map((m) => Array.isArray(m.profile) ? m.profile[0] : m.profile)
    .filter((p): p is { id: string; full_name: string | null; email: string } => !!p)

  const canManageSettings = profile.role === 'admin'
    || pipeline.created_by === user.id
    || members.some((m) => m.id === user.id)

  return (
    <AppLayout pageTitle={pipeline.name}>
      <PipelineBoard
        pipelineId={pipeline.id}
        pipelineName={pipeline.name}
        basePath="/admin/pipeline"
        stages={(stages ?? []) as PipelineStage[]}
        leads={leads}
        members={members}
        tags={(tags ?? []) as PipelineTag[]}
        overdueLeadIds={overdueLeadIds}
        activitiesByLead={activitiesByLead}
        timelineByLead={timelineByLead}
        attachmentsByLead={attachmentsByLead}
        canManageSettings={canManageSettings}
      />
    </AppLayout>
  )
}
