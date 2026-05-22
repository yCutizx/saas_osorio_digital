'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification, createNotificationForMany } from '@/lib/notifications'
import {
  addDays,
  composeDate,
  composeDueDate,
  computeFirstInvoiceDueDate,
  firstDayOfMonth,
  formatBRL,
  parseYMD,
  todayBRT,
} from '@/lib/finance'

type AdminClient = ReturnType<typeof createAdminClient>

// ── Auth helper: só admin acessa finanças ─────────────────────────────────────

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
    return { error: 'Sem permissão (apenas admin acessa finanças)' as const }
  }
  return { user, profile, admin }
}

function revalidateFinance(clientId?: string) {
  revalidatePath('/admin/finance')
  revalidatePath('/admin/dashboard')
  if (clientId) {
    revalidatePath(`/admin/clients/${clientId}/edit`)
    revalidatePath(`/admin/clients/${clientId}`)
    revalidatePath('/client/finance')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) createContractAction — cria contrato + primeira invoice (D7 ajustada)
// ─────────────────────────────────────────────────────────────────────────────

const contractInputSchema = z.object({
  client_id:     z.string().uuid(),
  monthly_value: z.number().positive('Valor mensal deve ser maior que zero'),
  billing_day:   z.number().int().min(1).max(31),
  start_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  end_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:         z.string().max(2000).nullable().optional(),
})

export async function createContractAction(input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = contractInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const data = parsed.data

  // Verifica cliente existe
  const { data: client } = await ctx.admin
    .from('clients')
    .select('id')
    .eq('id', data.client_id)
    .maybeSingle()
  if (!client) return { error: 'Cliente não encontrado' }

  // Verifica que não há contrato ativo (validação amigável; índice único garante de qualquer forma)
  const { data: existingActive } = await ctx.admin
    .from('financial_contracts')
    .select('id')
    .eq('client_id', data.client_id)
    .eq('status', 'active')
    .maybeSingle()
  if (existingActive) {
    return { error: 'Este cliente já tem um contrato ativo. Pause ou encerre o anterior antes.' }
  }

  // Cria contrato
  const { data: contract, error: contractErr } = await ctx.admin
    .from('financial_contracts')
    .insert({
      client_id:     data.client_id,
      monthly_value: data.monthly_value,
      billing_day:   data.billing_day,
      start_date:    data.start_date,
      end_date:      data.end_date ?? null,
      status:        'active',
      notes:         data.notes ?? null,
      created_by:    ctx.user.id,
    })
    .select('id, client_id, monthly_value, billing_day, start_date')
    .single()

  if (contractErr || !contract) {
    return { error: 'Erro ao criar contrato: ' + (contractErr?.message ?? 'desconhecido') }
  }

  // Gera primeira invoice (D7 ajustada — vence no mês corrente ou próximo)
  const firstDueDate    = computeFirstInvoiceDueDate({
    startDate:  data.start_date,
    billingDay: data.billing_day,
  })
  const referenceMonth  = firstDayOfMonth(firstDueDate)

  const { error: invoiceErr } = await ctx.admin
    .from('financial_invoices')
    .insert({
      client_id:       contract.client_id,
      contract_id:     contract.id,
      reference_month: referenceMonth,
      due_date:        firstDueDate,
      amount:          data.monthly_value,
      discount:        0,
      status:          'pending',
    })

  if (invoiceErr) {
    // Contrato já foi criado — não desfaz. Loga e segue. Rafael pode lançar manual.
    console.error('[createContractAction] primeira invoice falhou:', invoiceErr.message)
  }

  revalidateFinance(data.client_id)
  return { ok: true as const, contract_id: contract.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) updateContractAction — edita contrato (NÃO gera invoice nova)
// ─────────────────────────────────────────────────────────────────────────────

const updateContractSchema = z.object({
  monthly_value: z.number().positive().optional(),
  billing_day:   z.number().int().min(1).max(31).optional(),
  start_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:        z.enum(['active', 'paused', 'ended']).optional(),
  notes:         z.string().max(2000).nullable().optional(),
})

export async function updateContractAction(id: string, input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = updateContractSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { data: contract } = await ctx.admin
    .from('financial_contracts')
    .select('id, client_id')
    .eq('id', id)
    .maybeSingle()
  if (!contract) return { error: 'Contrato não encontrado' }

  const { error } = await ctx.admin
    .from('financial_contracts')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: 'Erro ao atualizar contrato: ' + error.message }

  revalidateFinance(contract.client_id)
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) markInvoiceAsPaidAction — pago + notifica admin
// ─────────────────────────────────────────────────────────────────────────────

const markPaidSchema = z.object({
  paid_at:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  paid_amount:    z.number().nonnegative('Valor pago não pode ser negativo'),
  payment_method: z.string().min(1).max(50),
  notes:          z.string().max(2000).optional(),
})

export async function markInvoiceAsPaidAction(id: string, input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = markPaidSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const d = parsed.data

  const { data: invoice } = await ctx.admin
    .from('financial_invoices')
    .select('id, client_id, amount, status, clients(name)')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return { error: 'Fatura não encontrada' }
  if (invoice.status === 'canceled') return { error: 'Fatura está cancelada — não pode marcar como paga' }

  const { error } = await ctx.admin
    .from('financial_invoices')
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

  // Notifica admins (incluindo o próprio que marcou — UX consistente)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (invoice as any).clients?.name ?? 'cliente'
  await notifyAdmins(ctx.admin, {
    type:    'finance.paid',
    title:   'Pagamento recebido',
    message: `Pagamento de ${clientName} confirmado: ${formatBRL(d.paid_amount)}`,
    link:    '/admin/finance',
  })

  revalidateFinance(invoice.client_id)
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) cancelInvoiceAction
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelInvoiceAction(id: string, reason: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!reason || reason.trim().length < 3) {
    return { error: 'Informe um motivo (mínimo 3 caracteres)' }
  }

  const { data: invoice } = await ctx.admin
    .from('financial_invoices')
    .select('id, client_id, notes, status')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return { error: 'Fatura não encontrada' }
  if (invoice.status === 'paid') return { error: 'Fatura paga não pode ser cancelada' }

  const newNotes = `${invoice.notes ? invoice.notes + '\n' : ''}[CANCELADA]: ${reason.trim()}`

  const { error } = await ctx.admin
    .from('financial_invoices')
    .update({
      status:     'canceled',
      notes:      newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: 'Erro ao cancelar: ' + error.message }

  revalidateFinance(invoice.client_id)
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) createTransactionAction — lançamento extra
// ─────────────────────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  client_id:        z.string().uuid().nullable().optional(),
  type:             z.enum(['income', 'expense', 'refund', 'adjustment']),
  amount:           z.number().positive('Valor deve ser maior que zero'),
  description:      z.string().min(3).max(500),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  category:         z.string().max(80).nullable().optional(),
  invoice_id:       z.string().uuid().nullable().optional(),
})

export async function createTransactionAction(input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = transactionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const d = parsed.data

  const { error } = await ctx.admin
    .from('financial_transactions')
    .insert({
      client_id:        d.client_id ?? null,
      type:             d.type,
      amount:           d.amount,
      description:      d.description,
      transaction_date: d.transaction_date,
      category:         d.category ?? null,
      invoice_id:       d.invoice_id ?? null,
      created_by:       ctx.user.id,
    })

  if (error) return { error: 'Erro ao lançar transação: ' + error.message }

  revalidateFinance(d.client_id ?? undefined)
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) generateMonthlyInvoices — chamada pelo cron diariamente
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMonthlyInvoices(
  admin: AdminClient,
): Promise<{ skipped: boolean; reason?: string; generated?: number; date?: string }> {
  const today = todayBRT()
  const { year, month, day } = parseYMD(today)

  if (day !== 1) {
    return { skipped: true, reason: 'not_first_day', date: today }
  }

  const { data: contracts, error } = await admin
    .from('financial_contracts')
    .select('id, client_id, monthly_value, billing_day')
    .eq('status', 'active')

  if (error) {
    console.error('[generateMonthlyInvoices] erro buscando contratos:', error.message)
    return { skipped: false, generated: 0, date: today }
  }

  const referenceMonth = composeDate(year, month, 1)
  let generated = 0

  for (const c of contracts ?? []) {
    const dueDate = composeDueDate(year, month, c.billing_day)
    const { error: insertErr } = await admin
      .from('financial_invoices')
      .upsert({
        client_id:       c.client_id,
        contract_id:     c.id,
        reference_month: referenceMonth,
        due_date:        dueDate,
        amount:          Number(c.monthly_value),
        discount:        0,
        status:          'pending',
      }, { onConflict: 'client_id,reference_month', ignoreDuplicates: true })

    if (insertErr) {
      console.error('[generateMonthlyInvoices] insert falhou pra contrato', c.id, insertErr.message)
      continue
    }
    generated++
  }

  return { skipped: false, generated, date: today }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) notifyUpcomingInvoices — vence amanhã (admin + cliente)
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyUpcomingInvoices(
  admin: AdminClient,
): Promise<{ notified: number }> {
  const today    = todayBRT()
  // addDays usa Date math nativo (respeita overflow de mês — ex: 31/01 + 1 = 01/02).
  // composeDate fazia cap no último dia e quebrava na virada de mês.
  const tomorrow = addDays(today, 1)

  // View live garante effective_status atualizado (overdue já não conta como pending)
  const { data: invoices, error } = await admin
    .from('financial_invoices_live')
    .select('id, client_id, due_date, amount, effective_status, clients(name)')
    .eq('due_date', tomorrow)
    .eq('effective_status', 'pending')

  if (error) {
    console.error('[notifyUpcomingInvoices] erro:', error.message)
    return { notified: 0 }
  }

  let notified = 0
  for (const inv of invoices ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientName = (inv as any).clients?.name ?? 'cliente'
    const amount     = Number(inv.amount)

    // Admin
    await notifyAdmins(admin, {
      type:    'finance.upcoming',
      title:   'Fatura vence amanhã',
      message: `Fatura de ${clientName} vence amanhã (${formatBRL(amount)})`,
      link:    '/admin/finance',
    })

    // Cliente (todos os user_ids com role='client' atribuídos a esse client_id)
    const clientUserIds = await getClientUserIds(admin, inv.client_id)
    if (clientUserIds.length > 0) {
      await createNotificationForMany(clientUserIds, {
        type:    'finance.upcoming',
        title:   'Sua fatura vence em breve',
        message: `Sua próxima fatura (${formatBRL(amount)}) vence amanhã.`,
        link:    '/client/finance',
      })
    }
    notified++
  }

  return { notified }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) notifyOverdueInvoices — atrasada há múltiplos de 7 dias (só admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyOverdueInvoices(
  admin: AdminClient,
): Promise<{ notified: number }> {
  const { data: invoices, error } = await admin
    .from('financial_invoices_live')
    .select('id, client_id, amount, days_overdue, effective_status, clients(name)')
    .eq('effective_status', 'overdue')

  if (error) {
    console.error('[notifyOverdueInvoices] erro:', error.message)
    return { notified: 0 }
  }

  let notified = 0
  for (const inv of invoices ?? []) {
    const days = Number(inv.days_overdue)
    if (days <= 0 || days % 7 !== 0) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientName = (inv as any).clients?.name ?? 'cliente'
    const amount     = Number(inv.amount)

    await notifyAdmins(admin, {
      type:    'finance.overdue',
      title:   'Fatura atrasada',
      message: `Fatura de ${clientName} atrasada há ${days} dias (${formatBRL(amount)})`,
      link:    '/admin/finance',
    })
    notified++
    // Cliente NÃO recebe — decisão Rafael (passivo-agressivo)
  }

  return { notified }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getClientUserIds(admin: AdminClient, clientId: string): Promise<string[]> {
  const { data } = await admin
    .from('client_assignments')
    .select('user_id')
    .eq('client_id', clientId)
    .eq('role', 'client')
  return (data ?? []).map((a) => a.user_id as string)
}

async function notifyAdmins(
  admin: AdminClient,
  payload: { type: string; title: string; message: string; link?: string },
) {
  const { data: admins } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
  const ids = (admins ?? []).map((a) => a.id as string)
  if (ids.length === 0) return
  if (ids.length === 1) {
    await createNotification({ userId: ids[0], ...payload })
  } else {
    await createNotificationForMany(ids, payload)
  }
}
