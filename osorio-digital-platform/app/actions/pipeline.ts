'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePipelinePaths } from '@/lib/revalidate-helpers'
import { createNotification } from '@/lib/notifications'
import { sendCapiEvent, warnIfStageNamesMissing } from '@/lib/meta-capi'
import { resolveCapiEventName, CAPI_TRACKED_STAGES } from '@/lib/capi-stage-map'

type AdminClient = ReturnType<typeof createAdminClient>

const ALLOWED_ROLES = ['admin', 'social_media', 'traffic_manager']

// ===== helpers =====

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil não encontrado' as const }
  if (!ALLOWED_ROLES.includes(profile.role)) return { error: 'Sem permissão' as const }

  return { user, profile, admin, supabase }
}

async function checkPipelineAccess(
  admin: AdminClient,
  pipelineId: string,
  userId: string,
  userRole: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (userRole === 'admin') return { ok: true }

  const { data: pipeline } = await admin
    .from('pipelines')
    .select('created_by')
    .eq('id', pipelineId)
    .single()

  if (!pipeline) return { ok: false, error: 'Pipeline não encontrado' }
  if (pipeline.created_by === userId) return { ok: true }

  const { data: member } = await admin
    .from('pipeline_members')
    .select('pipeline_id')
    .eq('pipeline_id', pipelineId)
    .eq('profile_id', userId)
    .maybeSingle()

  if (!member) return { ok: false, error: 'Sem acesso a este pipeline' }
  return { ok: true }
}

// revalidatePipelinePaths importado de '@/lib/revalidate-helpers'

async function logTimeline(
  admin: AdminClient,
  leadId: string,
  userId: string | null,
  eventType: string,
  eventData: Record<string, unknown> = {},
): Promise<void> {
  await admin.from('pipeline_lead_timeline').insert({
    lead_id: leadId,
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
  })
}

// ===== Pipelines =====

const PipelineSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(80),
  description: z.string().trim().max(280).optional().or(z.literal('')),
  color: z.string().default('#EACE00'),
  member_ids: z.array(z.string().uuid()).default([]),
})

const DEFAULT_STAGES = [
  { name: 'Lead Novo',   order: 1, color: '#6b7280' },
  { name: 'Qualificado', order: 2, color: '#3b82f6' },
  { name: 'Proposta',    order: 3, color: '#f59e0b' },
  { name: 'Negociação',  order: 4, color: '#8b5cf6' },
  { name: 'Fechado',     order: 5, color: '#10b981' },
  { name: 'Perdido',     order: 6, color: '#ef4444' },
]

export async function createPipelineAction(formData: FormData) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = PipelineSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description') ?? '',
    color:       formData.get('color') ?? '#EACE00',
    member_ids:  formData.getAll('member_ids') as string[],
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: pipeline, error } = await ctx.admin
    .from('pipelines')
    .insert({
      name:        parsed.data.name,
      description: parsed.data.description || null,
      color:       parsed.data.color,
      created_by:  ctx.user.id,
    })
    .select('id')
    .single()

  if (error || !pipeline) return { error: 'Erro ao criar pipeline' }

  const allMembers = Array.from(new Set([...parsed.data.member_ids, ctx.user.id]))
  await ctx.admin.from('pipeline_members').upsert(
    allMembers.map((profileId) => ({ pipeline_id: pipeline.id, profile_id: profileId })),
    { onConflict: 'pipeline_id,profile_id', ignoreDuplicates: true },
  )

  await ctx.admin.from('pipeline_stages_agency').insert(
    DEFAULT_STAGES.map((s) => ({ ...s, pipeline_id: pipeline.id })),
  )

  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
  revalidatePath('/traffic/pipeline')

  return { ok: true as const, id: pipeline.id }
}

export async function updatePipelineAction(formData: FormData) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID obrigatório' }

  const access = await checkPipelineAccess(ctx.admin, id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const parsed = PipelineSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description') ?? '',
    color:       formData.get('color') ?? '#EACE00',
    member_ids:  formData.getAll('member_ids') as string[],
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await ctx.admin
    .from('pipelines')
    .update({
      name:        parsed.data.name,
      description: parsed.data.description || null,
      color:       parsed.data.color,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)

  await ctx.admin.from('pipeline_members').delete().eq('pipeline_id', id)
  const allMembers = Array.from(new Set([...parsed.data.member_ids, ctx.user.id]))
  await ctx.admin.from('pipeline_members').upsert(
    allMembers.map((profileId) => ({ pipeline_id: id, profile_id: profileId })),
    { onConflict: 'pipeline_id,profile_id', ignoreDuplicates: true },
  )

  revalidatePipelinePaths(id)
  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
  revalidatePath('/traffic/pipeline')
  return { ok: true as const }
}

export async function deletePipelineAction(pipelineId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (ctx.profile.role !== 'admin') return { error: 'Apenas admin pode deletar' }

  await ctx.admin.from('pipelines').delete().eq('id', pipelineId)
  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
  revalidatePath('/traffic/pipeline')
  return { ok: true as const }
}

export async function regeneratePipelineTokenAction(pipelineId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const access = await checkPipelineAccess(ctx.admin, pipelineId, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const crypto = await import('crypto')
  const newToken = crypto.randomBytes(24).toString('hex')

  const { error } = await ctx.admin
    .from('pipelines')
    .update({ webhook_token: newToken, updated_at: new Date().toISOString() })
    .eq('id', pipelineId)

  if (error) return { error: 'Erro ao gerar token' }

  revalidatePipelinePaths(pipelineId)
  return { ok: true as const, token: newToken }
}

// ===== Stages =====

const StageInput = z.object({
  id:    z.string().uuid().optional(),
  name:  z.string().trim().min(1).max(60),
  order: z.number().int(),
  color: z.string().min(1),
})

export async function upsertStagesAction(
  pipelineId: string,
  stages: Array<{ id?: string; name: string; order: number; color: string }>,
) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const access = await checkPipelineAccess(ctx.admin, pipelineId, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const parsed = z.array(StageInput).min(2, 'Mínimo 2 etapas').safeParse(stages)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const existingIds = parsed.data.filter((s) => s.id).map((s) => s.id as string)

  if (existingIds.length > 0) {
    const quoted = existingIds.map((id) => `"${id}"`).join(',')
    await ctx.admin
      .from('pipeline_stages_agency')
      .delete()
      .eq('pipeline_id', pipelineId)
      .not('id', 'in', `(${quoted})`)
  } else {
    await ctx.admin.from('pipeline_stages_agency').delete().eq('pipeline_id', pipelineId)
  }

  for (const s of parsed.data) {
    if (s.id) {
      await ctx.admin
        .from('pipeline_stages_agency')
        .update({ name: s.name, order: s.order, color: s.color })
        .eq('id', s.id)
    } else {
      await ctx.admin.from('pipeline_stages_agency').insert({
        pipeline_id: pipelineId,
        name: s.name,
        order: s.order,
        color: s.color,
      })
    }
  }

  revalidatePipelinePaths(pipelineId)
  return { ok: true as const }
}

// ===== Tags =====

export async function createTagAction(pipelineId: string, name: string, color: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const access = await checkPipelineAccess(ctx.admin, pipelineId, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Nome obrigatório' }

  const { error } = await ctx.admin.from('pipeline_tags').insert({
    pipeline_id: pipelineId,
    name: trimmed,
    color,
  })

  if (error) return { error: 'Erro ao criar tag (talvez já exista)' }

  revalidatePath(`/admin/pipeline/${pipelineId}/settings`)
  revalidatePipelinePaths(pipelineId)
  return { ok: true as const }
}

export async function deleteTagAction(tagId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: tag } = await ctx.admin
    .from('pipeline_tags')
    .select('pipeline_id')
    .eq('id', tagId)
    .single()
  if (!tag) return { error: 'Tag não encontrada' }

  const access = await checkPipelineAccess(ctx.admin, tag.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  await ctx.admin.from('pipeline_tags').delete().eq('id', tagId)
  revalidatePath(`/admin/pipeline/${tag.pipeline_id}/settings`)
  revalidatePipelinePaths(tag.pipeline_id)
  return { ok: true as const }
}

export async function toggleLeadTagAction(leadId: string, tagId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id')
    .eq('id', leadId)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const { data: existing } = await ctx.admin
    .from('pipeline_lead_tags')
    .select('lead_id')
    .eq('lead_id', leadId)
    .eq('tag_id', tagId)
    .maybeSingle()

  if (existing) {
    await ctx.admin.from('pipeline_lead_tags').delete().eq('lead_id', leadId).eq('tag_id', tagId)
    await logTimeline(ctx.admin, leadId, ctx.user.id, 'tag_removed', { tag_id: tagId })
  } else {
    await ctx.admin.from('pipeline_lead_tags').insert({ lead_id: leadId, tag_id: tagId })
    await logTimeline(ctx.admin, leadId, ctx.user.id, 'tag_added', { tag_id: tagId })
  }

  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const }
}

// ===== Leads =====

const LeadSchema = z.object({
  pipeline_id:         z.string().uuid(),
  name:                z.string().trim().min(2, 'Nome obrigatório').max(120),
  company:             z.string().trim().max(120).optional().or(z.literal('')),
  email:               z.string().trim().email('Email inválido').optional().or(z.literal('')),
  phone:               z.string().trim().max(30).optional().or(z.literal('')),
  whatsapp:            z.string().trim().max(30).optional().or(z.literal('')),
  role:                z.string().trim().max(80).optional().or(z.literal('')),
  source:              z.string().default('manual'),
  estimated_value:     z.coerce.number().nullable().optional(),
  expected_close_date: z.string().optional().or(z.literal('')),
  probability:         z.coerce.number().min(0).max(100).nullable().optional(),
  stage:               z.string().min(1, 'Etapa obrigatória'),
  notes:               z.string().trim().max(2000).optional().or(z.literal('')),
  responsible_id:      z.string().uuid().nullable().optional(),
})

export async function createLeadAction(formData: FormData) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = LeadSchema.safeParse({
    pipeline_id:         formData.get('pipeline_id'),
    name:                formData.get('name'),
    company:             formData.get('company') ?? '',
    email:               formData.get('email') ?? '',
    phone:               formData.get('phone') ?? '',
    whatsapp:            formData.get('whatsapp') ?? '',
    role:                formData.get('role') ?? '',
    source:              formData.get('source') ?? 'manual',
    estimated_value:     formData.get('estimated_value') || null,
    expected_close_date: formData.get('expected_close_date') ?? '',
    probability:         formData.get('probability') || null,
    stage:               formData.get('stage'),
    notes:               formData.get('notes') ?? '',
    responsible_id:      formData.get('responsible_id') || null,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const access = await checkPipelineAccess(ctx.admin, parsed.data.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const { data: lead, error } = await ctx.admin
    .from('pipeline_leads')
    .insert({
      pipeline_id:         parsed.data.pipeline_id,
      name:                parsed.data.name,
      company:             parsed.data.company || null,
      email:               parsed.data.email || null,
      phone:               parsed.data.phone || null,
      whatsapp:            parsed.data.whatsapp || null,
      role:                parsed.data.role || null,
      source:              parsed.data.source,
      estimated_value:     parsed.data.estimated_value ?? null,
      expected_close_date: parsed.data.expected_close_date || null,
      probability:         parsed.data.probability ?? null,
      stage:               parsed.data.stage,
      notes:               parsed.data.notes || null,
      responsible_id:      parsed.data.responsible_id ?? null,
    })
    .select('id')
    .single()

  if (error || !lead) return { error: 'Erro ao criar lead' }

  await logTimeline(ctx.admin, lead.id, ctx.user.id, 'created', {
    stage:  parsed.data.stage,
    source: parsed.data.source,
  })

  // Notificar responsável (se setado e diferente do criador)
  if (parsed.data.responsible_id && parsed.data.responsible_id !== ctx.user.id) {
    await createNotification({
      userId:  parsed.data.responsible_id,
      type:    'lead_assigned',
      title:   'Você foi atribuído a um lead',
      message: parsed.data.name,
      link:    `/admin/pipeline/${parsed.data.pipeline_id}`,
    })
  }

  revalidatePipelinePaths(parsed.data.pipeline_id)
  return { ok: true as const, id: lead.id }
}

export async function updateLeadAction(
  leadId: string,
  patch: Partial<{
    name: string
    company: string | null
    email: string | null
    phone: string | null
    whatsapp: string | null
    role: string | null
    source: string
    estimated_value: number | null
    expected_close_date: string | null
    probability: number | null
    notes: string | null
    responsible_id: string | null
  }>,
) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id, name, responsible_id')
    .eq('id', leadId)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const { error } = await ctx.admin
    .from('pipeline_leads')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { error: 'Erro ao atualizar' }

  await logTimeline(ctx.admin, leadId, ctx.user.id, 'field_updated', { fields: Object.keys(patch) })

  // Notificar novo responsável se mudou (e não é o próprio user)
  if (
    'responsible_id' in patch &&
    patch.responsible_id &&
    patch.responsible_id !== lead.responsible_id &&
    patch.responsible_id !== ctx.user.id
  ) {
    await createNotification({
      userId:  patch.responsible_id,
      type:    'lead_assigned',
      title:   'Você foi atribuído a um lead',
      message: lead.name,
      link:    `/admin/pipeline/${lead.pipeline_id}`,
    })
  }

  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const }
}

export async function moveLeadAction(leadId: string, newStage: string, newPosition: number) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id, stage')
    .eq('id', leadId)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const isWon  = newStage === 'Fechado'
  const isLost = newStage === 'Perdido'

  const { error } = await ctx.admin
    .from('pipeline_leads')
    .update({ stage: newStage, position: newPosition, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { error: 'Erro ao mover lead' }

  if (lead.stage !== newStage) {
    let eventType = 'stage_changed'
    if (isWon) eventType = 'won'
    else if (isLost) eventType = 'lost'
    else if (lead.stage === 'Perdido' || lead.stage === 'Fechado') eventType = 'reopened'

    await logTimeline(ctx.admin, leadId, ctx.user.id, eventType, {
      from: lead.stage,
      to:   newStage,
    })

    // Meta CAPI semi-manual — só pipeline alvo (Site Pronto), só etapas mapeadas.
    // AWAITED dentro de try/catch isolado: serverless da Vercel mata a função
    // após o response, então fire-and-forget perderia o evento.
    const capiPipelineId = process.env.META_CAPI_PIPELINE_ID
    if (capiPipelineId && lead.pipeline_id === capiPipelineId) {
      const eventName = resolveCapiEventName(newStage)
      if (eventName) {
        try {
          await warnIfStageNamesMissing(ctx.admin, lead.pipeline_id, CAPI_TRACKED_STAGES)
          const { data: fullLead } = await ctx.admin
            .from('pipeline_leads')
            .select('id, name, email, phone, whatsapp, estimated_value')
            .eq('id', leadId)
            .single()
          if (fullLead) await sendCapiEvent(ctx.admin, fullLead, eventName)
        } catch (e) {
          // Failsafe: nunca quebra a movimentação.
          console.error('[CAPI] erro ao despachar (move segue normal):', e instanceof Error ? e.message : e)
        }
      }
    }
  }

  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const, needs_lost_reason: isLost }
}

export async function setLostReasonAction(leadId: string, reason: string, reasonOther: string | null) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id')
    .eq('id', leadId)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const { error } = await ctx.admin
    .from('pipeline_leads')
    .update({
      lost_reason:       reason,
      lost_reason_other: reasonOther,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { error: 'Erro ao salvar motivo' }

  await logTimeline(ctx.admin, leadId, ctx.user.id, 'lost', { reason, reason_other: reasonOther })

  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const }
}

export async function deleteLeadAction(leadId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id')
    .eq('id', leadId)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  await ctx.admin.from('pipeline_leads').delete().eq('id', leadId)
  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const }
}

// ===== Activities =====

export async function createActivityAction(
  leadId: string,
  type: string,
  description: string,
  scheduledAt: string | null,
) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id')
    .eq('id', leadId)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const { error } = await ctx.admin.from('pipeline_activities').insert({
    lead_id:      leadId,
    user_id:      ctx.user.id,
    type,
    description,
    scheduled_at: scheduledAt,
    done:         false,
  })

  if (error) return { error: 'Erro ao criar atividade' }
  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const }
}

export async function toggleActivityAction(activityId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: activity } = await ctx.admin
    .from('pipeline_activities')
    .select('done, lead_id, pipeline_leads(pipeline_id)')
    .eq('id', activityId)
    .single()
  if (!activity) return { error: 'Atividade não encontrada' }

  await ctx.admin
    .from('pipeline_activities')
    .update({ done: !activity.done })
    .eq('id', activityId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineId = (activity as any)?.pipeline_leads?.pipeline_id as string | undefined
  if (pipelineId) revalidatePipelinePaths(pipelineId)

  return { ok: true as const }
}

export async function deleteActivityAction(activityId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: activity } = await ctx.admin
    .from('pipeline_activities')
    .select('pipeline_leads(pipeline_id)')
    .eq('id', activityId)
    .single()

  await ctx.admin.from('pipeline_activities').delete().eq('id', activityId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineId = (activity as any)?.pipeline_leads?.pipeline_id as string | undefined
  if (pipelineId) revalidatePipelinePaths(pipelineId)

  return { ok: true as const }
}

// ===== Attachments =====

export async function uploadLeadAttachmentAction(leadId: string, formData: FormData) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Arquivo obrigatório' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo até 10MB' }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id')
    .eq('id', leadId)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${leadId}/${timestamp}-${random}.${ext}`

  const { error: uploadErr } = await ctx.admin.storage
    .from('pipeline-attachments')
    .upload(path, file, { upsert: false })

  if (uploadErr) return { error: 'Erro no upload' }

  const { data: { publicUrl } } = ctx.admin.storage
    .from('pipeline-attachments')
    .getPublicUrl(path)

  await ctx.admin.from('pipeline_lead_attachments').insert({
    lead_id:     leadId,
    file_name:   file.name,
    file_url:    publicUrl,
    file_size:   file.size,
    uploaded_by: ctx.user.id,
  })

  await logTimeline(ctx.admin, leadId, ctx.user.id, 'attachment_added', { file_name: file.name })
  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const }
}

export async function deleteLeadAttachmentAction(attachmentId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: att } = await ctx.admin
    .from('pipeline_lead_attachments')
    .select('lead_id, file_url')
    .eq('id', attachmentId)
    .single()
  if (!att) return { error: 'Anexo não encontrado' }

  const { data: lead } = await ctx.admin
    .from('pipeline_leads')
    .select('pipeline_id')
    .eq('id', att.lead_id)
    .single()
  if (!lead) return { error: 'Lead não encontrado' }

  const access = await checkPipelineAccess(ctx.admin, lead.pipeline_id, ctx.user.id, ctx.profile.role)
  if (!access.ok) return { error: access.error }

  const urlParts = att.file_url.split('/pipeline-attachments/')
  if (urlParts.length > 1) {
    await ctx.admin.storage.from('pipeline-attachments').remove([urlParts[1]])
  }

  await ctx.admin.from('pipeline_lead_attachments').delete().eq('id', attachmentId)
  revalidatePipelinePaths(lead.pipeline_id)
  return { ok: true as const }
}

// ===== Projects / Deliverables (intactas - fora do escopo da Etapa 8) =====

export async function createProjectAction(data: {
  client_id: string
  name: string
  description?: string
  stage: string
  responsible_id?: string
  start_date?: string
  end_date?: string
  value?: number
}) {
  const ctx = await getCtx()
  if ('error' in ctx) throw new Error(ctx.error)

  const { error } = await ctx.admin.from('pipeline_projects').insert({
    client_id:      data.client_id,
    name:           data.name,
    description:    data.description || null,
    stage:          data.stage,
    responsible_id: data.responsible_id || null,
    start_date:     data.start_date || null,
    end_date:       data.end_date || null,
    value:          data.value || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
}

export async function updateProjectStageAction(projectId: string, stage: string) {
  const ctx = await getCtx()
  if ('error' in ctx) throw new Error(ctx.error)

  const { error } = await ctx.admin
    .from('pipeline_projects')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
}

export async function createDeliverableAction(data: {
  project_id: string
  name: string
  description?: string
  status: string
  due_date?: string
}) {
  const ctx = await getCtx()
  if ('error' in ctx) throw new Error(ctx.error)

  const { error } = await ctx.admin.from('pipeline_deliverables').insert({
    project_id:  data.project_id,
    name:        data.name,
    description: data.description || null,
    status:      data.status,
    due_date:    data.due_date || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
  revalidatePath('/client/pipeline')
}

export async function moveDeliverableAction(deliverableId: string, newStatus: string) {
  const ctx = await getCtx()
  if ('error' in ctx) throw new Error(ctx.error)

  const { error } = await ctx.admin
    .from('pipeline_deliverables')
    .update({ status: newStatus })
    .eq('id', deliverableId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
  revalidatePath('/client/pipeline')
}

// ===== Webhooks (tabela antiga - intactas) =====

export async function createWebhookAction(data: { name: string; url: string; events: string[] }) {
  const ctx = await getCtx()
  if ('error' in ctx) throw new Error(ctx.error)
  if (ctx.profile.role !== 'admin') throw new Error('Apenas admin')

  const cryptoMod = await import('crypto')
  const secret_key = cryptoMod.randomBytes(24).toString('hex')

  const { error } = await ctx.admin.from('pipeline_webhooks').insert({
    name: data.name,
    url: data.url,
    events: data.events,
    active: true,
    secret_key,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/pipeline/webhooks')
}

export async function toggleWebhookAction(id: string, active: boolean) {
  const ctx = await getCtx()
  if ('error' in ctx) throw new Error(ctx.error)
  if (ctx.profile.role !== 'admin') throw new Error('Apenas admin')

  const { error } = await ctx.admin.from('pipeline_webhooks').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/pipeline/webhooks')
}

export async function deleteWebhookAction(id: string) {
  const ctx = await getCtx()
  if ('error' in ctx) throw new Error(ctx.error)
  if (ctx.profile.role !== 'admin') throw new Error('Apenas admin')

  const { error } = await ctx.admin.from('pipeline_webhooks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/pipeline/webhooks')
}
