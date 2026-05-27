import { createAdminClient } from '@/lib/supabase/admin'
import { CommercialKpiCards } from './kpi-cards'
import { todayBRT, parseYMD } from '@/lib/finance'

export default async function CommercialOverviewPage() {
  const admin = createAdminClient()

  // 4 KPIs:
  // 1) A pagar agora = SUM(commission_amount) WHERE status='pending'
  // 2) Pago no mês = SUM(paid_amount)        WHERE status='paid' AND paid_at no mês atual
  // 3) Geradas no mês = COUNT(*)             WHERE created_at no mês atual
  // 4) Vendedores ativos = COUNT(DISTINCT user_id) FROM client_sellers WHERE active=true

  const today = todayBRT()
  const { year, month } = parseYMD(today)
  const ymKey   = `${year}-${String(month).padStart(2, '0')}`
  const startOfMonthIso = `${ymKey}-01T00:00:00Z`
  const nextMonthYear  = month === 12 ? year + 1 : year
  const nextMonth      = month === 12 ? 1        : month + 1
  const endOfMonthIso  = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`

  const [
    { data: pendingRows },
    { data: paidRows },
    { count: generatedCount },
    { data: activeSellers },
  ] = await Promise.all([
    admin.from('commission_invoices').select('commission_amount').eq('status', 'pending'),
    admin.from('commission_invoices')
      .select('paid_amount')
      .eq('status', 'paid')
      .gte('paid_at', startOfMonthIso)
      .lt('paid_at',  endOfMonthIso),
    admin.from('commission_invoices')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonthIso)
      .lt('created_at',  endOfMonthIso),
    admin.from('client_sellers').select('user_id').eq('active', true),
  ])

  const toPay        = (pendingRows ?? []).reduce((s, r) => s + Number(r.commission_amount ?? 0), 0)
  const paidThisMo   = (paidRows ?? []).reduce((s, r) => s + Number(r.paid_amount ?? 0), 0)
  const generatedMo  = generatedCount ?? 0
  const sellersAtivos = new Set((activeSellers ?? []).map((r) => r.user_id as string)).size

  return (
    <div className="space-y-6">
      <CommercialKpiCards
        toPay={toPay}
        paidThisMonth={paidThisMo}
        generatedThisMonth={generatedMo}
        activeSellers={sellersAtivos}
      />

      {/* Estado de "primeiro uso" — orienta o admin se ainda não tem nada */}
      {toPay === 0 && paidThisMo === 0 && generatedMo === 0 && (
        <div className="rounded-2xl bg-[#111] border border-[#222] p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">Como funciona o módulo Comercial</h3>
          <ol className="text-sm text-white/60 space-y-1.5 list-decimal list-inside">
            <li>Configure os defaults de comissão em <span className="text-[#EACE00]">Configurações</span>.</li>
            <li>Cadastre vendedores/SDRs/closers na aba <span className="text-[#EACE00]">Time</span>.</li>
            <li>Vincule cada vendedor a um cliente na aba <span className="text-[#EACE00]">Comercial</span> da edição do cliente.</li>
            <li>Quando uma fatura do cliente for marcada como paga, as comissões aparecem em <span className="text-[#EACE00]">Comissões</span>.</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
