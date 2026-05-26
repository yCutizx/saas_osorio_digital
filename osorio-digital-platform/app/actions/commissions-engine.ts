'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { getCommissionDefaults } from '@/lib/app-settings'
import {
  applyCommissionRule,
  computeProportionalFactor,
  mergeWithDefaults,
} from '@/lib/commissions'
import { formatBRL, lastDayOfMonth, parseYMD } from '@/lib/finance'
import type {
  ClientSeller,
  CommissionRule,
  SellerRole,
} from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Calcula e grava commission_invoices vinculadas a uma invoice paga.
 * Idempotente via UNIQUE(source_invoice_id, source_seller_role).
 *
 * Disparado pelo `markInvoiceAsPaidAction` (Etapa 15). NUNCA bloqueia o
 * markAsPaid em caso de erro — quem chama deve envolver em try/catch.
 */
export async function generateCommissionsFromPaidInvoice(
  admin: AdminClient,
  invoiceId: string,
): Promise<{ created: number }> {
  // 1) Carrega invoice + contract
  const { data: invoice, error: invErr } = await admin
    .from('financial_invoices')
    .select('id, client_id, contract_id, reference_month, amount, paid_amount, status, clients(name)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (invErr || !invoice) {
    console.error('[commissions] invoice não encontrada', invErr?.message)
    return { created: 0 }
  }
  if (invoice.status !== 'paid') return { created: 0 }
  if (!invoice.contract_id) {
    // Invoice sem contrato (ex: lançamento manual) — sem comissão.
    return { created: 0 }
  }

  // 2) monthIndex = posição cronológica da invoice no contrato, EXCLUINDO canceladas.
  const { count: monthIndexRaw } = await admin
    .from('financial_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', invoice.contract_id)
    .lte('reference_month', invoice.reference_month)
    .neq('status', 'canceled')
  const monthIndex = monthIndexRaw ?? 1

  // 3) Sellers ATIVOS no reference_month da invoice (D3 ajustada).
  //    "ativos no mês" = assigned_at <= último dia do mês
  //                       E (active=true OU deactivated_at > último dia do mês)
  const { year, month } = parseYMD(invoice.reference_month)
  const lastDay = lastDayOfMonth(year, month)
  const lastDayIso = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59Z`

  const { data: rawSellers } = await admin
    .from('client_sellers')
    .select('*')
    .eq('client_id', invoice.client_id)
    .lte('assigned_at', lastDayIso)

  const sellers = (rawSellers ?? []).filter((s) => {
    if (s.active) return true
    if (!s.deactivated_at) return false
    return s.deactivated_at > lastDayIso
  }) as ClientSeller[]

  if (sellers.length === 0) return { created: 0 }

  // 4) Regra efetiva = primeira custom_rule não-nula entre os vínculos, ou defaults.
  const defaults  = await getCommissionDefaults()
  const customRow = sellers.find((s) => s.custom_rule)
  const effectiveRule: CommissionRule = mergeWithDefaults(customRow?.custom_rule ?? null, defaults)

  // 5) Fator proporcional (pagamento parcial)
  const paidAmount   = Number(invoice.paid_amount ?? invoice.amount)
  const invoiceAmount = Number(invoice.amount)
  const factor       = computeProportionalFactor(paidAmount, invoiceAmount)

  // 6) Pra cada seller, calcula e insere
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (invoice as any).clients?.name ?? 'cliente'
  let created = 0

  for (const s of sellers) {
    const baseForCalc = paidAmount  // já reflete pagamento parcial
    const result = applyCommissionRule(
      effectiveRule,
      monthIndex,
      baseForCalc,
      s.seller_role as SellerRole,
      factor,
    )

    if (result.amount <= 0) continue

    const { error: insertErr, data: inserted } = await admin
      .from('commission_invoices')
      .upsert({
        seller_user_id:     s.user_id,
        client_id:          invoice.client_id,
        source_invoice_id:  invoice.id,
        source_seller_role: s.seller_role,
        source_month_index: monthIndex,
        base_amount:        baseForCalc,
        commission_pct:     result.pct   ?? null,
        commission_fixed:   result.fixed ?? null,
        commission_amount:  result.amount,
        status:             'pending',
      }, { onConflict: 'source_invoice_id,source_seller_role', ignoreDuplicates: true })
      .select('id')

    if (insertErr) {
      console.error('[commissions] insert falhou pra seller', s.user_id, insertErr.message)
      continue
    }
    if (!inserted || inserted.length === 0) {
      // ignoreDuplicates → linha já existia. Não notifica de novo.
      continue
    }

    created++

    // Notifica o vendedor
    await createNotification({
      userId:  s.user_id,
      type:    'commission.generated',
      title:   'Nova comissão gerada',
      message: `Comissão de ${formatBRL(result.amount)} gerada — cliente ${clientName} pagou fatura (mês ${monthIndex}).`,
      link:    '/seller/commissions',
    })
  }

  return { created }
}

/**
 * Cancela comissões PENDENTES vinculadas a uma invoice cancelada.
 * Comissões já pagas (status='paid') ficam intactas — admin decide caso a caso.
 */
export async function cancelCommissionsFromCanceledInvoice(
  admin: AdminClient,
  invoiceId: string,
): Promise<{ canceled: number }> {
  const { data: canceled, error } = await admin
    .from('commission_invoices')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('source_invoice_id', invoiceId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    console.error('[commissions] cancel falhou:', error.message)
    return { canceled: 0 }
  }
  return { canceled: canceled?.length ?? 0 }
}

/**
 * Retorna o user_id do "dono" da receita pra popular seller_id em
 * financial_invoices durante geração mensal.
 *
 * Prioridade: vendedor único > closer. SDR não vira "dono" porque sua
 * comissão é one-shot no mês 1; o relacionamento longo é com o closer.
 */
export async function getActiveSellerForInvoiceGeneration(
  admin: AdminClient,
  clientId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('client_sellers')
    .select('user_id, seller_role')
    .eq('client_id', clientId)
    .eq('active', true)
    .in('seller_role', ['vendedor', 'closer'])

  if (!data || data.length === 0) return null

  const vendedor = data.find((s) => s.seller_role === 'vendedor')
  if (vendedor) return vendedor.user_id as string

  const closer = data.find((s) => s.seller_role === 'closer')
  return closer ? (closer.user_id as string) : null
}
