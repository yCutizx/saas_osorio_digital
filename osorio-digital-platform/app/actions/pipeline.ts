'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getCtx(allowedRoles = ['admin', 'social_media']) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (!profile || !allowedRoles.includes(profile.role)) throw new Error('Acesso negado')
  return { admin, user, profile }
}

// ─── LEADS ──────────────────────────────────────────────────────────────────

export async function createLeadAction(data: {
  name: string
  company?: string
  email?: string
  phone?: string
  source: string
  estimated_value?: number
  stage: string
  notes?: string
  responsible_id?: string
}) {
  const { admin } = await getCtx()

  const { error } = await admin.from('pipeline_leads').insert({
    name: data.name,
    company: data.company || null,
    email: data.email || null,
    phone: data.phone || null,
    source: data.source,
    estimated_value: data.estimated_value || null,
    stage: data.stage,
    notes: data.notes || null,
    responsible_id: data.responsible_id || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
}

export async function updateLeadAction(id: string, data: {
  name?: string
  company?: string
  email?: string
  phone?: string
  source?: string
  estimated_value?: number | null
  stage?: string
  notes?: string
  responsible_id?: string | null
}) {
  const { admin } = await getCtx()

  const { error } = await admin
    .from('pipeline_leads')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
}

export async function moveLeadAction(leadId: string, newStage: string) {
  const { admin } = await getCtx()

  const { error } = await admin
    .from('pipeline_leads')
    .update({ stage: newStage, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
}

export async function deleteLeadAction(id: string) {
  const { admin } = await getCtx()

  const { error } = await admin.from('pipeline_leads').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
}

// ─── ACTIVITIES ──────────────────────────────────────────────────────────────

export async function createActivityAction(data: {
  lead_id: string
  type: string
  description: string
  scheduled_at?: string
  done?: boolean
}) {
  const { admin, user } = await getCtx()

  const { error } = await admin.from('pipeline_activities').insert({
    lead_id: data.lead_id,
    user_id: user.id,
    type: data.type,
    description: data.description,
    scheduled_at: data.scheduled_at || null,
    done: data.done ?? false,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
}

export async function toggleActivityAction(id: string, done: boolean) {
  const { admin } = await getCtx()

  const { error } = await admin
    .from('pipeline_activities')
    .update({ done })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline')
  revalidatePath('/social/pipeline')
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────

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
  const { admin } = await getCtx()

  const { error } = await admin.from('pipeline_projects').insert({
    client_id: data.client_id,
    name: data.name,
    description: data.description || null,
    stage: data.stage,
    responsible_id: data.responsible_id || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    value: data.value || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
}

export async function updateProjectStageAction(projectId: string, stage: string) {
  const { admin } = await getCtx()

  const { error } = await admin
    .from('pipeline_projects')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
}

// ─── DELIVERABLES ────────────────────────────────────────────────────────────

export async function createDeliverableAction(data: {
  project_id: string
  name: string
  description?: string
  status: string
  due_date?: string
}) {
  const { admin } = await getCtx()

  const { error } = await admin.from('pipeline_deliverables').insert({
    project_id: data.project_id,
    name: data.name,
    description: data.description || null,
    status: data.status,
    due_date: data.due_date || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
  revalidatePath('/client/pipeline')
}

export async function moveDeliverableAction(deliverableId: string, newStatus: string) {
  const { admin } = await getCtx()

  const { error } = await admin
    .from('pipeline_deliverables')
    .update({ status: newStatus })
    .eq('id', deliverableId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/projects')
  revalidatePath('/social/pipeline/projects')
  revalidatePath('/client/pipeline')
}

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────

export async function createWebhookAction(data: {
  name: string
  url: string
  events: string[]
}) {
  const { admin } = await getCtx(['admin'])

  const secret_key = crypto.randomUUID().replace(/-/g, '')

  const { error } = await admin.from('pipeline_webhooks').insert({
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
  const { admin } = await getCtx(['admin'])

  const { error } = await admin
    .from('pipeline_webhooks')
    .update({ active })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/webhooks')
}

export async function deleteWebhookAction(id: string) {
  const { admin } = await getCtx(['admin'])

  const { error } = await admin.from('pipeline_webhooks').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/pipeline/webhooks')
}
