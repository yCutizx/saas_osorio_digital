import 'server-only'
import crypto from 'crypto'
import { z } from 'zod'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { CapiEventName } from '@/lib/capi-stage-map'

type AdminClient = ReturnType<typeof createAdminClient>

const META_API_BASE = 'https://graph.facebook.com/v21.0'
const PURCHASE_FALLBACK_VALUE = 497.00

/**
 * Lead mínimo necessário pra montar `user_data` e (no caso de Purchase)
 * `custom_data.value`. Todos os PII vêm hasheados antes do envio.
 */
const LeadInputSchema = z.object({
  id:              z.string().uuid(),
  name:            z.string().nullable().optional(),
  email:           z.string().nullable().optional(),
  phone:           z.string().nullable().optional(),
  whatsapp:        z.string().nullable().optional(),
  estimated_value: z.number().nullable().optional(),
})
export type CapiLeadInput = z.infer<typeof LeadInputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Hashing helpers
// ─────────────────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Telefone: só dígitos, com DDI 55 prefixado se não tiver. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  // Heurística BR: número local começa com DDD (2 dígitos) + 8/9 dígitos → 10/11 dígitos no total.
  // Se já tiver 12+ dígitos começando com 55, mantém; senão prefixa 55.
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return `55${digits}`
}

function splitName(full: string): { fn: string; ln: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { fn: '', ln: '' }
  if (parts.length === 1) return { fn: parts[0].toLowerCase(), ln: '' }
  return {
    fn: parts[0].toLowerCase(),
    ln: parts[parts.length - 1].toLowerCase(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload
// ─────────────────────────────────────────────────────────────────────────────

interface UserData {
  em?: [string]
  ph?: [string]
  fn?: [string]
  ln?: [string]
}

interface EventEntry {
  event_name:    CapiEventName
  event_time:    number
  event_id:      string
  action_source: 'system_generated'
  user_data:     UserData
  custom_data?:  { value: number; currency: 'BRL' }
}

interface CapiPayload {
  data:             EventEntry[]
  test_event_code?: string
}

function buildUserData(lead: CapiLeadInput): UserData {
  const ud: UserData = {}

  const email = lead.email?.trim()
  if (email) ud.em = [sha256(normalizeEmail(email))]

  // WhatsApp prioritário sobre phone (mais confiável no BR)
  const rawPhone = lead.whatsapp?.trim() || lead.phone?.trim() || ''
  if (rawPhone) {
    const normalized = normalizePhone(rawPhone)
    if (normalized) ud.ph = [sha256(normalized)]
  }

  const fullName = lead.name?.trim()
  if (fullName) {
    const { fn, ln } = splitName(fullName)
    if (fn) ud.fn = [sha256(fn)]
    if (ln) ud.ln = [sha256(ln)]
  }

  return ud
}

function buildEventEntry(lead: CapiLeadInput, eventName: CapiEventName): EventEntry {
  const entry: EventEntry = {
    event_name:    eventName,
    event_time:    Math.floor(Date.now() / 1000),
    event_id:      `${lead.id}-${eventName}`,
    action_source: 'system_generated',
    user_data:     buildUserData(lead),
  }

  if (eventName === 'Purchase') {
    const v = lead.estimated_value
    const value = (typeof v === 'number' && v > 0) ? v : PURCHASE_FALLBACK_VALUE
    entry.custom_data = { value, currency: 'BRL' }
  }

  return entry
}

// ─────────────────────────────────────────────────────────────────────────────
// Envio + log (idempotente via unique constraint em capi_events_log)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia evento pra Meta CAPI e grava em `capi_events_log`.
 *
 * Garantias:
 *  - Nunca lança (try/catch interno em tudo).
 *  - Idempotência DUPLA: `event_id` determinístico (Meta deduplica) +
 *    unique (lead_id, event_name) no log local.
 *  - Sem retry automático: 1 tentativa, grava log do resultado, fim.
 */
export async function sendCapiEvent(
  admin: AdminClient,
  rawLead: unknown,
  eventName: CapiEventName,
): Promise<void> {
  try {
    const parsed = LeadInputSchema.safeParse(rawLead)
    if (!parsed.success) {
      console.error('[CAPI] lead inválido pra envio:', parsed.error.issues[0]?.message)
      return
    }
    const lead    = parsed.data
    const eventId = `${lead.id}-${eventName}`

    // Idempotência local — se já tem registro pra esse (lead, evento), pula.
    // Spec: sem retry automático nesta versão (mesmo se status='error').
    const { data: existing } = await admin
      .from('capi_events_log')
      .select('id')
      .eq('lead_id',    lead.id)
      .eq('event_name', eventName)
      .maybeSingle()

    if (existing) return

    const pixelId = process.env.META_PIXEL_ID
    const token   = process.env.META_CAPI_TOKEN
    if (!pixelId || !token) {
      console.error('[CAPI] META_PIXEL_ID ou META_CAPI_TOKEN ausente — envio pulado')
      return
    }

    const payload: CapiPayload = { data: [buildEventEntry(lead, eventName)] }
    const testCode = process.env.META_TEST_EVENT_CODE?.trim()
    if (testCode) payload.test_event_code = testCode

    let status: 'sent' | 'error' = 'error'
    let responseBody: unknown    = null
    let errorMessage: string | null = null

    try {
      const url = `${META_API_BASE}/${pixelId}/events?access_token=${encodeURIComponent(token)}`
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        cache:   'no-store',
      })

      try { responseBody = await res.json() } catch { responseBody = null }

      if (res.ok) {
        status = 'sent'
      } else {
        errorMessage = `HTTP ${res.status}`
        console.error('[CAPI] falha HTTP', res.status, responseBody)
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : 'erro de rede'
      console.error('[CAPI] erro de rede no envio:', errorMessage)
    }

    const { error: insertErr } = await admin.from('capi_events_log').insert({
      lead_id:       lead.id,
      event_name:    eventName,
      event_id:      eventId,
      status,
      response:      responseBody,
      error_message: errorMessage,
    })
    if (insertErr) {
      // Tipicamente: race com unique constraint. Não escala.
      console.error('[CAPI] falha ao gravar capi_events_log:', insertErr.message)
    }
  } catch (e) {
    console.error('[CAPI] erro inesperado:', e instanceof Error ? e.message : e)
  }
}

/**
 * Valida que as etapas mapeadas em CAPI_TRACKED_STAGES existem na config do
 * pipeline. Não bloqueia nada — apenas console.warn quando ausentes, pra
 * sinalizar que o de-para em `lib/capi-stage-map.ts` ficou defasado por
 * renomeação no UI.
 */
export async function warnIfStageNamesMissing(
  admin: AdminClient,
  pipelineId: string,
  expectedNames: string[],
): Promise<void> {
  try {
    const { data } = await admin
      .from('pipeline_stages_agency')
      .select('name')
      .eq('pipeline_id', pipelineId)
    const found   = new Set((data ?? []).map((r) => r.name as string))
    const missing = expectedNames.filter((n) => !found.has(n))
    if (missing.length > 0) {
      console.warn(
        '[CAPI] etapas mapeadas ausentes neste pipeline — renomeação detectada, atualize lib/capi-stage-map.ts:',
        missing.join(', '),
      )
    }
  } catch (e) {
    console.error('[CAPI] erro ao validar nomes de etapa:', e instanceof Error ? e.message : e)
  }
}
