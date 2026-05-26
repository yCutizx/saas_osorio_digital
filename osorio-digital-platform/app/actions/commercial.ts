'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { setCommissionDefaults } from '@/lib/app-settings'
import { formatBRL } from '@/lib/finance'
import type { SellerRole, CommissionRule } from '@/types'

async function getAdminCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Sem permissão (apenas admin gerencia comercial)' as const }
  }
  return { user, profile, admin }
}

function revalidateCommercial(clientId?: string) {
  revalidatePath('/admin/commissions')
  revalidatePath('/admin/finance')
  revalidatePath('/seller/dashboard')
  revalidatePath('/seller/clients')
  revalidatePath('/seller/commissions')
  if (clientId) {
    revalidatePath(`/admin/clients/${clientId}/edit`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) setClientSellersAction — gerencia vínculos (SDR / Closer / Vendedor)
// ─────────────────────────────────────────────────────────────────────────────

const commissionRuleSchema = z.object({
  sdr_fixed:          z.number().nonnegative(),
  closer_month_1_pct: z.number().min(0).max(100),
  closer_month_2_pct: z.number().min(0).max(100),
  closer_month_3_pct: z.number().min(0).max(100),
})

const setSellersSchema = z.object({
  clientId:    z.string().uuid(),
  sdrId:       z.string().uuid().nullable().optional(),
  closerId:    z.string().uuid().nullable().optional(),
  vendedorId:  z.string().uuid().nullable().optional(),
  customRule:  commissionRuleSchema.nullable().optional(),
})

/**
 * Substitui os vínculos comerciais ativos do cliente. Cada papel (sdr / closer
 * / vendedor) pode ser explicitamente null pra remover. Mantém histórico:
 * vínculos anteriores ficam com active=false + deactivated_at=now.
 *
 * Validação D4: se `vendedorId` presente, sdrId/closerId devem ser null.
 */
export async function setClientSellersAction(input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = setSellersSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const { clientId, sdrId, closerId, vendedorId, customRule } = parsed.data

  // Validação D4: vendedor único não coexiste com SDR/Closer
  if (vendedorId && (sdrId || closerId)) {
    return { error: 'Vendedor único não pode coexistir com SDR ou Closer. Escolha um modelo.' }
  }

  // Confirma roles dos profiles selecionados
  const idsToCheck = [sdrId, closerId, vendedorId].filter((x): x is string => !!x)
  if (idsToCheck.length > 0) {
    const { data: profiles } = await ctx.admin
      .from('profiles')
      .select('id, role')
      .in('id', idsToCheck)

    const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p.role as string]))

    if (sdrId && !['sdr', 'vendedor'].includes(profileMap.get(sdrId) ?? '')) {
      return { error: 'Usuário selecionado pra SDR não tem papel SDR ou Vendedor' }
    }
    if (closerId && !['closer', 'vendedor'].includes(profileMap.get(closerId) ?? '')) {
      return { error: 'Usuário selecionado pra Closer não tem papel Closer ou Vendedor' }
    }
    if (vendedorId && profileMap.get(vendedorId) !== 'vendedor') {
      return { error: 'Usuário selecionado pra Vendedor não tem papel Vendedor' }
    }
  }

  const desired: Array<{ role: SellerRole; userId: string | null }> = [
    { role: 'sdr',      userId: sdrId      ?? null },
    { role: 'closer',   userId: closerId   ?? null },
    { role: 'vendedor', userId: vendedorId ?? null },
  ]

  const now = new Date().toISOString()

  for (const { role, userId } of desired) {
    // Vínculo ativo atual desse papel
    const { data: current } = await ctx.admin
      .from('client_sellers')
      .select('id, user_id')
      .eq('client_id', clientId)
      .eq('seller_role', role)
      .eq('active', true)
      .maybeSingle()

    // Sem mudança? skip
    if ((current?.user_id ?? null) === userId) continue

    // Desativa o atual (se existe)
    if (current?.id) {
      await ctx.admin
        .from('client_sellers')
        .update({ active: false, deactivated_at: now })
        .eq('id', current.id)
    }

    // Insere o novo (se userId presente)
    if (userId) {
      const { error: insertErr } = await ctx.admin
        .from('client_sellers')
        .insert({
          client_id:   clientId,
          user_id:     userId,
          seller_role: role,
          custom_rule: customRule ?? null,
          active:      true,
          assigned_at: now,
        })
      if (insertErr) {
        return { error: `Erro ao vincular ${role}: ${insertErr.message}` }
      }
    }
  }

  revalidateCommercial(clientId)
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) setCommissionDefaultsAction — atualiza defaults globais (Settings)
// ─────────────────────────────────────────────────────────────────────────────

export async function setCommissionDefaultsAction(input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = commissionRuleSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Regra inválida' }
  }

  try {
    await setCommissionDefaults(parsed.data as CommissionRule, ctx.user.id)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao salvar defaults' }
  }

  revalidatePath('/admin/settings/commissions')
  revalidatePath('/admin/commissions')
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) markCommissionAsPaidAction — admin marca comissão como paga
// ─────────────────────────────────────────────────────────────────────────────

const markCommissionPaidSchema = z.object({
  paid_at:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  paid_amount:    z.number().nonnegative(),
  payment_method: z.string().min(1).max(50),
  notes:          z.string().max(2000).optional(),
})

export async function markCommissionAsPaidAction(id: string, input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = markCommissionPaidSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const d = parsed.data

  const { data: commission } = await ctx.admin
    .from('commission_invoices')
    .select('id, seller_user_id, client_id, commission_amount, status, clients(name)')
    .eq('id', id)
    .maybeSingle()

  if (!commission)                       return { error: 'Comissão não encontrada' }
  if (commission.status === 'paid')      return { error: 'Comissão já está marcada como paga' }
  if (commission.status === 'canceled')  return { error: 'Comissão está cancelada' }

  const { error } = await ctx.admin
    .from('commission_invoices')
    .update({
      status:         'paid',
      paid_at:        new Date(d.paid_at + 'T12:00:00Z').toISOString(),
      paid_amount:    d.paid_amount,
      paid_by:        ctx.user.id,
      payment_method: d.payment_method,
      notes:          d.notes ?? null,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: 'Erro ao marcar como paga: ' + error.message }

  // Notifica o vendedor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (commission as any).clients?.name ?? 'cliente'
  await createNotification({
    userId:  commission.seller_user_id,
    type:    'commission.paid',
    title:   'Comissão paga',
    message: `Sua comissão de ${formatBRL(d.paid_amount)} (cliente ${clientName}) foi marcada como paga.`,
    link:    '/seller/commissions',
  })

  revalidateCommercial(commission.client_id)
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) cancelCommissionAction — admin cancela comissão pendente
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelCommissionAction(id: string, reason: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!reason || reason.trim().length < 3) {
    return { error: 'Informe um motivo (mínimo 3 caracteres)' }
  }

  const { data: commission } = await ctx.admin
    .from('commission_invoices')
    .select('id, client_id, notes, status')
    .eq('id', id)
    .maybeSingle()

  if (!commission)                      return { error: 'Comissão não encontrada' }
  if (commission.status === 'paid')     return { error: 'Comissão paga não pode ser cancelada' }
  if (commission.status === 'canceled') return { error: 'Comissão já está cancelada' }

  const newNotes = `${commission.notes ? commission.notes + '\n' : ''}[CANCELADA]: ${reason.trim()}`

  const { error } = await ctx.admin
    .from('commission_invoices')
    .update({
      status:     'canceled',
      notes:      newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: 'Erro ao cancelar: ' + error.message }

  revalidateCommercial(commission.client_id)
  return { ok: true as const }
}

