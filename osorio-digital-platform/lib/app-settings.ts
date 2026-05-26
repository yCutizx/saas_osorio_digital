/**
 * Wrapper de leitura/escrita da tabela `app_settings` (key/value JSONB).
 * Atualmente cobre apenas `commission_defaults`. Cache em memória de 5 min
 * evita query repetida durante o cálculo de comissão.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { CommissionRule } from '@/types'
import { DEFAULT_COMMISSION_RULE } from '@/lib/commissions'

const CACHE_TTL_MS = 5 * 60 * 1000

let cachedDefaults: { value: CommissionRule; expiresAt: number } | null = null

export async function getCommissionDefaults(): Promise<CommissionRule> {
  if (cachedDefaults && cachedDefaults.expiresAt > Date.now()) {
    return cachedDefaults.value
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'commission_defaults')
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: CommissionRule = (data?.value as any) ?? DEFAULT_COMMISSION_RULE

  cachedDefaults = { value, expiresAt: Date.now() + CACHE_TTL_MS }
  return value
}

export function invalidateCommissionDefaultsCache() {
  cachedDefaults = null
}

export async function setCommissionDefaults(
  newDefaults: CommissionRule,
  userId: string,
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('app_settings')
    .upsert({
      key:        'commission_defaults',
      value:      newDefaults,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
  invalidateCommissionDefaultsCache()
}
