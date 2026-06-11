/**
 * De-para etapa do pipeline → evento Meta CAPI.
 *
 * Comparação por NOME EXATO da etapa (case-sensitive). Justificativa:
 * `pipeline_leads.stage` é armazenado como texto literal (não FK pra
 * `pipeline_stages_agency`), então não há ID estável pra comparar.
 *
 * Se as etapas do pipeline alvo forem RENOMEADAS no UI de configurações,
 * atualize as chaves deste mapa. Há um warn em tempo de execução que avisa
 * quando os nomes mapeados não existem no pipeline.
 */
export type CapiEventName = 'LeadQualificado' | 'Purchase'

export const CAPI_STAGE_MAP: Record<string, CapiEventName> = {
  'Qualificado': 'LeadQualificado',
  'Fechado':     'Purchase',
}

export const CAPI_TRACKED_STAGES: string[] = Object.keys(CAPI_STAGE_MAP)

export function resolveCapiEventName(stageName: string): CapiEventName | null {
  return CAPI_STAGE_MAP[stageName] ?? null
}
