export type UserRole = 'admin' | 'traffic_manager' | 'social_media' | 'client'

export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'twitter'

export const ALL_PLATFORMS: Platform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter']

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook:  'Facebook',
  linkedin:  'LinkedIn',
  tiktok:    'TikTok',
  twitter:   'Twitter',
}

export const PLATFORM_SHORT: Record<Platform, string> = {
  instagram: 'IG',
  facebook:  'FB',
  linkedin:  'LI',
  tiktok:    'TT',
  twitter:   'TW',
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  logo_url: string | null
  industry: string | null
  contact_email: string | null
  contact_phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  client_id: string
  name: string
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin' | 'other'
  status: 'active' | 'paused' | 'finished'
  budget_monthly: number | null
  created_at: string
  updated_at: string
}

export interface TrafficReport {
  id: string
  campaign_id: string
  client_id: string
  period_start: string
  period_end: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number | null
  created_at: string
}

export interface ContentPost {
  id: string
  client_id: string
  title: string
  caption: string | null
  media_url: string | null
  platforms: Platform[]
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published'
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type InsightType =
  | 'mercado'
  | 'tendencia'
  | 'benchmark'
  | 'performance'
  | 'oportunidade'
  | 'alerta'
  | 'dica'

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  mercado:      'Análise de Mercado',
  tendencia:    'Tendência',
  benchmark:    'Benchmark',
  performance:  'Relatório de Performance',
  oportunidade: 'Oportunidade',
  alerta:       'Alerta',
  dica:         'Dica Estratégica',
}

export interface Insight {
  id: string
  title: string
  content: string
  type: InsightType | string | null
  client_id: string | null
  cover_url: string | null
  file_url: string | null
  tags: string[] | null
  published: boolean
  published_at: string | null
  author_id: string | null
  created_at: string
  updated_at: string
  // joins opcionais
  client?: { id: string; name: string } | null
  author?: { id: string; full_name: string | null } | null
}

// ===== Pipeline (Etapa 8) =====

export interface Pipeline {
  id: string
  name: string
  description: string | null
  color: string
  webhook_token: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  order: number
  color: string
}

export interface PipelineTag {
  id: string
  pipeline_id: string
  name: string
  color: string
}

export type LeadTemperature = 'frio' | 'morno' | 'quente'

export interface Lead {
  id: string
  pipeline_id: string
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
  stage: string
  position: number
  notes: string | null
  lost_reason: string | null
  lost_reason_other: string | null
  responsible_id: string | null
  created_at: string
  updated_at: string
  responsible?: { id: string; full_name: string | null; email: string } | null
  tags?: PipelineTag[]
}

export interface LeadAttachment {
  id: string
  lead_id: string
  file_name: string
  file_url: string
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

export type LeadTimelineEventType =
  | 'created' | 'stage_changed' | 'field_updated' | 'note_added'
  | 'won' | 'lost' | 'reopened' | 'attachment_added' | 'tag_added' | 'tag_removed'

export interface LeadTimelineEvent {
  id: string
  lead_id: string
  user_id: string | null
  event_type: LeadTimelineEventType
  event_data: Record<string, unknown>
  created_at: string
  user?: { full_name: string | null; email: string } | null
}

export interface PipelineActivity {
  id: string
  lead_id: string
  user_id: string
  type: string
  description: string
  scheduled_at: string | null
  done: boolean
  created_at: string
}

export const LEAD_FIELD_LABELS: Record<string, string> = {
  name:                'nome',
  company:             'empresa',
  role:                'cargo',
  email:               'email',
  phone:               'telefone',
  whatsapp:            'WhatsApp',
  source:              'origem',
  estimated_value:     'valor estimado',
  expected_close_date: 'data prevista de fechamento',
  probability:         'probabilidade',
  notes:               'notas',
  responsible_id:      'responsável',
  stage:               'etapa',
  lost_reason:         'motivo de perda',
  lost_reason_other:   'detalhe do motivo',
}

/**
 * Traduz lista de field names internos pra labels PT-BR.
 * Campos desconhecidos passam direto (fallback).
 */
export function translateFieldList(fields: string[]): string {
  return fields.map((f) => LEAD_FIELD_LABELS[f] ?? f).join(', ')
}

export const LEAD_LOST_REASONS = [
  'Sem orçamento',
  'Concorrente fechou',
  'Lead frio / sem interesse',
  'Timing ruim',
  'Não é o decisor',
  'Não respondeu',
  'Fora do perfil',
  'Outro',
] as const

export type LeadLostReason = typeof LEAD_LOST_REASONS[number]

export const LEAD_SOURCES = [
  { value: 'manual',    label: 'Manual' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'meta_ads',  label: 'Meta Ads' },
  { value: 'google',    label: 'Google' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site',      label: 'Site' },
  { value: 'outro',     label: 'Outro' },
] as const

/**
 * 0-33: frio, 34-66: morno, 67-100: quente
 */
export function getLeadTemperature(probability: number | null): LeadTemperature | null {
  if (probability === null || probability === undefined) return null
  if (probability <= 33) return 'frio'
  if (probability <= 66) return 'morno'
  return 'quente'
}

export const TEMPERATURE_LABEL: Record<LeadTemperature, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
}

export const TEMPERATURE_COLOR: Record<LeadTemperature, string> = {
  frio:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  morno: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  quente: 'text-red-400 bg-red-500/10 border-red-500/20',
}
