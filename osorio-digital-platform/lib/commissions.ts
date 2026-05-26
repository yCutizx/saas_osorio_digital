/**
 * Helpers puros de comissão (Etapa 16).
 * Sem chamadas de banco — pode rodar em server e client.
 */

import type { CommissionRule, CommissionStatus, SellerRole } from '@/types'

export const DEFAULT_COMMISSION_RULE: CommissionRule = {
  sdr_fixed:          150,
  closer_month_1_pct: 30,
  closer_month_2_pct: 10,
  closer_month_3_pct:  5,
}

// ── Cálculo ───────────────────────────────────────────────────────────────────

export interface AppliedCommission {
  amount: number
  pct?:   number  // pct aplicado (só pra closer/vendedor)
  fixed?: number  // fixo aplicado (só pra sdr)
}

/**
 * Aplica a regra de comissão dado o papel, índice do mês (1-N) e valor base
 * (já com fator proporcional aplicado se pagamento parcial).
 *
 * - SDR: ganha o `sdr_fixed` SOMENTE no mês 1. Demais meses: 0.
 * - Closer/Vendedor: pct decrescente por mês. monthIndex > 3 → 0.
 */
export function applyCommissionRule(
  rule:       CommissionRule,
  monthIndex: number,
  baseAmount: number,
  sellerRole: SellerRole,
  proportionalFactor: number,
): AppliedCommission {
  if (sellerRole === 'sdr') {
    if (monthIndex !== 1) return { amount: 0, fixed: 0 }
    const amount = round2(rule.sdr_fixed * proportionalFactor)
    return { amount, fixed: rule.sdr_fixed }
  }

  // closer ou vendedor
  const pct =
    monthIndex === 1 ? rule.closer_month_1_pct :
    monthIndex === 2 ? rule.closer_month_2_pct :
    monthIndex === 3 ? rule.closer_month_3_pct :
    0

  if (pct <= 0) return { amount: 0, pct: 0 }
  const amount = round2(baseAmount * (pct / 100))
  return { amount, pct }
}

/** Fator 0-1 — pagamento parcial reduz comissão proporcionalmente. */
export function computeProportionalFactor(paidAmount: number, invoiceAmount: number): number {
  if (invoiceAmount <= 0) return 0
  const factor = paidAmount / invoiceAmount
  return Math.max(0, Math.min(1, factor))
}

/** Merge custom rule com defaults — campos null/undefined em custom usam o default. */
export function mergeWithDefaults(custom: Partial<CommissionRule> | null, defaults: CommissionRule): CommissionRule {
  if (!custom) return defaults
  return {
    sdr_fixed:          custom.sdr_fixed          ?? defaults.sdr_fixed,
    closer_month_1_pct: custom.closer_month_1_pct ?? defaults.closer_month_1_pct,
    closer_month_2_pct: custom.closer_month_2_pct ?? defaults.closer_month_2_pct,
    closer_month_3_pct: custom.closer_month_3_pct ?? defaults.closer_month_3_pct,
  }
}

// ── Formatação ────────────────────────────────────────────────────────────────

export function formatCommissionRule(rule: CommissionRule): string {
  return `SDR R$ ${rule.sdr_fixed} fixo · Closer ${rule.closer_month_1_pct}/${rule.closer_month_2_pct}/${rule.closer_month_3_pct}%`
}

export function formatCommissionStatus(status: CommissionStatus): string {
  const labels: Record<CommissionStatus, string> = {
    pending:  'Pendente',
    paid:     'Pago',
    canceled: 'Cancelado',
  }
  return labels[status]
}

export function getCommissionStatusColor(status: CommissionStatus): string {
  const colors: Record<CommissionStatus, string> = {
    pending:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    paid:     'text-green-400 bg-green-500/10 border-green-500/20',
    canceled: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  }
  return colors[status]
}

export function getSellerRoleLabel(role: SellerRole): string {
  const labels: Record<SellerRole, string> = {
    vendedor: 'Vendedor',
    sdr:      'SDR',
    closer:   'Closer',
  }
  return labels[role]
}

// ── Internal ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
