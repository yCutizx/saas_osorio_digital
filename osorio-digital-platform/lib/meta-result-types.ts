/**
 * Mapeamento centralizado: optimization_goal / objective / action_type → result_type
 * canônico → label visual.
 *
 * O `result_type` salvo no banco vem SEM prefixo (ex: 'link_click', não 'actions:link_click').
 * É a string canônica usada em queries e UI.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/reference/adgroup/insights
 */

export type ResultCategory =
  | 'trafego'
  | 'engajamento'
  | 'mensagem'
  | 'venda'
  | 'lead'
  | 'alcance'
  | 'visualizacao'
  | 'outro'

// ── action_type → label PT-BR ──────────────────────────────────────────────────
export const RESULT_TYPE_LABELS: Record<string, string> = {
  // Tráfego
  'link_click':                                                  'cliques no link',
  'landing_page_view':                                           'visualizações da LP',
  // Engajamento
  'post_engagement':                                             'engajamentos',
  'page_engagement':                                             'engajamentos',
  'post_reaction':                                               'reações',
  'like':                                                        'curtidas',
  'comment':                                                     'comentários',
  'post_share':                                                  'compartilhamentos',
  // Mensagem
  'onsite_conversion.messaging_conversation_started_7d':         'mensagens iniciadas',
  'messaging_conversation_started':                              'mensagens iniciadas',
  // Vídeo
  'video_view':                                                  'visualizações de vídeo',
  'video_thruplay_watched_actions':                              'visualizações completas',
  // Conversão / Vendas
  'purchase':                                                    'compras',
  'omni_purchase':                                               'compras',
  'offsite_conversion.fb_pixel_purchase':                        'compras',
  'onsite_conversion.purchase':                                  'compras',
  'add_to_cart':                                                 'adições ao carrinho',
  'initiate_checkout':                                           'checkouts iniciados',
  // Lead
  'lead':                                                        'leads gerados',
  'leadgen.other':                                               'leads gerados',
  'onsite_conversion.lead_grouped':                              'leads gerados',
  'complete_registration':                                       'cadastros',
  'submit_application':                                          'inscrições',
  // App
  'mobile_app_install':                                          'instalações',
  // Perfil (limitado — Meta API quase não expõe)
  'onsite_conversion.flow_complete':                             'visitas no perfil',
}

// ── action_type → categoria (cor/ícone) ────────────────────────────────────────
export const RESULT_TYPE_CATEGORY: Record<string, ResultCategory> = {
  'link_click':                                                  'trafego',
  'landing_page_view':                                           'trafego',
  'post_engagement':                                             'engajamento',
  'page_engagement':                                             'engajamento',
  'post_reaction':                                               'engajamento',
  'like':                                                        'engajamento',
  'comment':                                                     'engajamento',
  'post_share':                                                  'engajamento',
  'onsite_conversion.messaging_conversation_started_7d':         'mensagem',
  'messaging_conversation_started':                              'mensagem',
  'video_view':                                                  'visualizacao',
  'video_thruplay_watched_actions':                              'visualizacao',
  'purchase':                                                    'venda',
  'omni_purchase':                                               'venda',
  'offsite_conversion.fb_pixel_purchase':                        'venda',
  'onsite_conversion.purchase':                                  'venda',
  'add_to_cart':                                                 'venda',
  'initiate_checkout':                                           'venda',
  'lead':                                                        'lead',
  'leadgen.other':                                               'lead',
  'onsite_conversion.lead_grouped':                              'lead',
  'complete_registration':                                       'lead',
  'submit_application':                                          'lead',
  'mobile_app_install':                                          'venda',
  'onsite_conversion.flow_complete':                             'trafego',
}

// ── Cores brand por categoria ──────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<ResultCategory, string> = {
  trafego:      '#3B82F6',  // azul
  engajamento:  '#A855F7',  // roxo
  mensagem:     '#EACE00',  // brand yellow
  venda:        '#10B981',  // verde
  lead:         '#10B981',  // verde
  alcance:      '#6B7280',  // cinza
  visualizacao: '#F97316',  // laranja
  outro:        '#6B7280',
}

/** Resolve label visual a partir de result_type. Fallback graceful. */
export function resolveResultLabel(result_type: string | null | undefined): string {
  if (!result_type) return 'resultados'
  return RESULT_TYPE_LABELS[result_type] ?? 'resultados'
}

/** Resolve categoria pra cor/ícone. */
export function resolveResultCategory(result_type: string | null | undefined): ResultCategory {
  if (!result_type) return 'outro'
  return RESULT_TYPE_CATEGORY[result_type] ?? 'outro'
}

// ── optimization_goal → lista priorizada de action_types ──────────────────────
/**
 * Usado pelo extractor pra decidir qual count tratar como `conversions` /
 * `result_type` primário de uma linha de insight.
 *
 * Ordem importa: 1º match com value>0 vence.
 */
export const OPTIMIZATION_GOAL_PRIMARY_ACTION: Record<string, string[]> = {
  LINK_CLICKS:         ['link_click'],
  LANDING_PAGE_VIEWS:  ['landing_page_view'],
  POST_ENGAGEMENT:     ['post_engagement', 'page_engagement'],
  PAGE_LIKES:          ['like'],
  POST_REACTIONS:      ['post_reaction'],
  CONVERSATIONS:       ['onsite_conversion.messaging_conversation_started_7d', 'messaging_conversation_started'],
  VIDEO_VIEWS:         ['video_view'],
  THRUPLAY:            ['video_thruplay_watched_actions', 'video_view'],
  OFFSITE_CONVERSIONS: ['offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase', 'purchase', 'omni_purchase'],
  VALUE:               ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'],
  LEAD_GENERATION:     ['onsite_conversion.lead_grouped', 'lead', 'leadgen.other'],
  APP_INSTALLS:        ['mobile_app_install'],
  REACH:               [], // reach é campo direto, não actions[]
  IMPRESSIONS:         [], // idem
}

// ── objective (Campaign) → optimization_goal típico (AdSet) ───────────────────
/**
 * Usado como fallback quando a campanha não tem `optimization_goal` (porque
 * a Meta API expõe esse campo principalmente no AdSet, não no Campaign).
 */
export const OBJECTIVE_FALLBACK_GOAL: Record<string, string> = {
  // Outcomes modernos (ODAX, 2022+)
  OUTCOME_TRAFFIC:        'LINK_CLICKS',
  OUTCOME_ENGAGEMENT:     'POST_ENGAGEMENT',
  OUTCOME_AWARENESS:      'REACH',
  OUTCOME_SALES:          'OFFSITE_CONVERSIONS',
  OUTCOME_LEADS:          'LEAD_GENERATION',
  OUTCOME_APP_PROMOTION:  'APP_INSTALLS',
  // Objectives legacy (campanhas antigas usam esses)
  LINK_CLICKS:            'LINK_CLICKS',
  CONVERSIONS:            'OFFSITE_CONVERSIONS',
  POST_ENGAGEMENT:        'POST_ENGAGEMENT',
  PAGE_LIKES:             'PAGE_LIKES',
  VIDEO_VIEWS:            'VIDEO_VIEWS',
  MESSAGES:               'CONVERSATIONS',
  LEAD_GENERATION:        'LEAD_GENERATION',
  BRAND_AWARENESS:        'REACH',
  REACH:                  'REACH',
  APP_INSTALLS:           'APP_INSTALLS',
}
