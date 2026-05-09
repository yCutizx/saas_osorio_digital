import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const admin = createAdminClient()

  // Validate Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const secretKey = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!secretKey) {
    return NextResponse.json({ error: 'Invalid Authorization format' }, { status: 401 })
  }

  // Find active webhook with matching secret_key
  const { data: webhook } = await admin
    .from('pipeline_webhooks')
    .select('id, secret_key, events, active')
    .eq('secret_key', secretKey)
    .eq('active', true)
    .single()

  if (!webhook) {
    return NextResponse.json({ error: 'Invalid or inactive webhook key' }, { status: 403 })
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, company, email, phone, source, estimated_value, notes } = body as {
    name?: string
    company?: string
    email?: string
    phone?: string
    source?: string
    estimated_value?: number
    notes?: string
  }

  if (!name) {
    // Log error
    await admin.from('pipeline_webhook_logs').insert({
      webhook_id: webhook.id,
      event: 'lead.created',
      payload: body,
      status: 'error',
    })
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
  }

  const validSources = ['manual', 'whatsapp', 'meta_ads', 'google', 'indicacao', 'site']
  const leadSource = source && validSources.includes(source) ? source : 'manual'

  // Create lead
  const { data: lead, error: leadError } = await admin.from('pipeline_leads').insert({
    name,
    company: company ?? null,
    email: email ?? null,
    phone: phone ?? null,
    source: leadSource,
    estimated_value: estimated_value ?? null,
    notes: notes ?? null,
    stage: 'Lead Novo',
  }).select('id, stage').single()

  if (leadError || !lead) {
    await admin.from('pipeline_webhook_logs').insert({
      webhook_id: webhook.id,
      event: 'lead.created',
      payload: body,
      status: 'error',
    })
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // Log success
  await admin.from('pipeline_webhook_logs').insert({
    webhook_id: webhook.id,
    event: 'lead.created',
    payload: body,
    status: 'success',
  })

  return NextResponse.json({ id: lead.id, stage: lead.stage }, { status: 201 })
}
