import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const BODY_LIMIT = 1024 * 1024 // 1 MB
const VALID_SOURCES = ['manual', 'whatsapp', 'meta_ads', 'google', 'indicacao', 'site', 'outro']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 401 })
  }

  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > BODY_LIMIT) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const admin = createAdminClient()

  const { data: pipeline } = await admin
    .from('pipelines')
    .select('id')
    .eq('webhook_token', token)
    .maybeSingle()

  if (!pipeline) {
    logger.warn('pipeline/inbound: token inválido')
    return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
  }

  const { data: firstStage } = await admin
    .from('pipeline_stages_agency')
    .select('name')
    .eq('pipeline_id', pipeline.id)
    .order('order', { ascending: true })
    .limit(1)
    .maybeSingle()

  const stage = firstStage?.name ?? 'Lead Novo'

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Campo "name" obrigatório' }, { status: 400 })
  }

  const sourceRaw = typeof body.source === 'string' ? body.source : 'manual'
  const source = VALID_SOURCES.includes(sourceRaw) ? sourceRaw : 'manual'

  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  const { data: lead, error } = await admin
    .from('pipeline_leads')
    .insert({
      pipeline_id:     pipeline.id,
      name,
      company:         str(body.company),
      email:           str(body.email),
      phone:           str(body.phone),
      whatsapp:        str(body.whatsapp),
      role:            str(body.role),
      source,
      estimated_value: num(body.estimated_value),
      notes:           str(body.notes),
      stage,
    })
    .select('id')
    .single()

  if (error || !lead) {
    logger.error('pipeline/inbound: erro ao criar lead', { error: error?.message })
    return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 })
  }

  await admin.from('pipeline_lead_timeline').insert({
    lead_id:    lead.id,
    user_id:    null,
    event_type: 'created',
    event_data: { stage, source, via: 'webhook' },
  })

  logger.info('pipeline/inbound: lead criado', { id: lead.id, pipeline: pipeline.id })
  return NextResponse.json({ ok: true, lead_id: lead.id, stage }, { status: 201 })
}
