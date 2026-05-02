import Link from 'next/link'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft, Pencil, Mail, Phone, Building2, Calendar,
  TrendingUp, Camera, BarChart2, CalendarDays, Clock, FileText,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { cn } from '@/lib/utils'

const PLAN_CONFIG: Record<string, { label: string; classes: string }> = {
  basico:  { label: 'Básico',  classes: 'bg-white/8 text-white/50 border-white/10' },
  pro:     { label: 'Pro',     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  premium: { label: 'Premium', classes: 'bg-[#EACE00]/15 text-[#EACE00] border-[#EACE00]/25' },
}

const CONTRACT_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  ativo:     { label: 'Ativo',     classes: 'bg-green-500/15 text-green-400 border-green-500/30',   dot: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' },
  pausado:   { label: 'Pausado',   classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  encerrado: { label: 'Encerrado', classes: 'bg-red-500/15 text-red-400 border-red-500/30',          dot: 'bg-red-400' },
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-white/40" />
      </div>
      <div>
        <p className="text-xs text-white/35">{label}</p>
        <p className="text-sm text-white font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const [
    { data: clientRow },
    { data: assignments },
    { data: reports },
  ] = await Promise.all([
    adminSupabase
      .from('clients')
      .select('id, name, industry, contact_email, contact_phone, plan, active, contract_status, monthly_value, renewal_date, notes, created_at')
      .eq('id', params.id)
      .single(),
    supabase
      .from('client_assignments')
      .select('role, user_id, profiles(full_name, email)')
      .eq('client_id', params.id),
    supabase
      .from('traffic_reports')
      .select('id, period_start, period_end, conversions, spend, roas, created_at, campaigns(name, platform)')
      .eq('client_id', params.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (!clientRow) notFound()

  // Last sign in
  const clientAssignment = assignments?.find((a) => a.role === 'client')
  let lastSignIn: string | null = null
  if (clientAssignment?.user_id) {
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(clientAssignment.user_id)
    lastSignIn = authUser?.user?.last_sign_in_at ?? null
  }

  const trafficAssignment = assignments?.find((a) => a.role === 'traffic_manager')
  const socialAssignment  = assignments?.find((a) => a.role === 'social_media')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trafficName = (trafficAssignment?.profiles as any)?.full_name ?? (trafficAssignment?.profiles as any)?.email ?? '—'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socialName  = (socialAssignment?.profiles  as any)?.full_name ?? (socialAssignment?.profiles  as any)?.email ?? '—'

  const plan     = PLAN_CONFIG[clientRow.plan] ?? PLAN_CONFIG.basico
  const contract = CONTRACT_CONFIG[clientRow.contract_status ?? 'ativo'] ?? CONTRACT_CONFIG.ativo

  const totalSpend       = reports?.reduce((s, r) => s + Number(r.spend ?? 0), 0) ?? 0
  const totalConversions = reports?.reduce((s, r) => s + Number(r.conversions ?? 0), 0) ?? 0

  return (
    <AppLayout pageTitle={clientRow.name}>
      <div className="space-y-6 max-w-5xl">

        {/* Voltar */}
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Link>

        {/* Header card */}
        <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EACE00]/15 border border-[#EACE00]/25 flex items-center justify-center shrink-0">
                <span className="text-[#EACE00] font-black text-xl">
                  {clientRow.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white leading-tight">{clientRow.name}</h1>
                <p className="text-sm text-white/40 mt-0.5">
                  {clientRow.industry ?? 'Segmento não informado'}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full border font-semibold', plan.classes)}>
                    {plan.label}
                  </span>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5', contract.classes)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', contract.dot)} />
                    {contract.label}
                  </span>
                  {!clientRow.active && (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/40 font-semibold">
                      Inativo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`/admin/clients/${clientRow.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors shrink-0"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Dados cadastrais */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-4">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Dados Cadastrais</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clientRow.contact_email && (
                  <InfoRow icon={Mail} label="E-mail" value={clientRow.contact_email} />
                )}
                {clientRow.contact_phone && (
                  <InfoRow icon={Phone} label="Telefone" value={clientRow.contact_phone} />
                )}
                <InfoRow icon={Building2} label="Segmento" value={clientRow.industry ?? '—'} />
                <InfoRow
                  icon={Calendar}
                  label="Cliente desde"
                  value={format(parseISO(clientRow.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                />
              </div>
            </div>

            {/* Contrato */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-4">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Contrato</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white/3 border border-white/8 p-4 text-center">
                  <p className="text-xs text-white/35 mb-1">Status</p>
                  <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full border', contract.classes)}>
                    {contract.label}
                  </span>
                </div>
                <div className="rounded-xl bg-white/3 border border-white/8 p-4 text-center">
                  <p className="text-xs text-white/35 mb-1">Valor mensal</p>
                  <p className="text-lg font-black text-white">
                    {clientRow.monthly_value
                      ? `R$ ${Number(clientRow.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : <span className="text-white/25 text-sm font-normal">Não definido</span>
                    }
                  </p>
                </div>
                <div className="rounded-xl bg-white/3 border border-white/8 p-4 text-center">
                  <p className="text-xs text-white/35 mb-1">Renovação</p>
                  <p className="text-sm font-bold text-white">
                    {clientRow.renewal_date
                      ? format(parseISO(clientRow.renewal_date), "d MMM yyyy", { locale: ptBR })
                      : <span className="text-white/25 font-normal">Não definida</span>
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Histórico de relatórios */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Relatórios de Tráfego</h2>
                {reports && reports.length > 0 && (
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>{totalConversions} conv. total</span>
                    <span>R$ {totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} investido</span>
                  </div>
                )}
              </div>

              {!reports?.length ? (
                <p className="text-sm text-white/30 py-4 text-center">Nenhum relatório enviado ainda.</p>
              ) : (
                <div className="space-y-1">
                  {reports.map((r) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const campaignName = (r.campaigns as any)?.name ?? '—'
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white/80 font-medium truncate">{campaignName}</p>
                          <p className="text-xs text-white/30 mt-0.5">
                            {format(parseISO(r.period_start), 'dd/MM')} – {format(parseISO(r.period_end), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-xs text-right">
                          <div>
                            <p className="text-white/40">Conv.</p>
                            <p className="text-white font-semibold">{r.conversions}</p>
                          </div>
                          <div>
                            <p className="text-white/40">Gasto</p>
                            <p className="text-white font-semibold">
                              R$ {Number(r.spend).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </p>
                          </div>
                          {r.roas != null && (
                            <div>
                              <p className="text-white/40">ROAS</p>
                              <p className={cn('font-semibold', Number(r.roas) >= 3 ? 'text-green-400' : Number(r.roas) >= 1.5 ? 'text-yellow-400' : 'text-red-400')}>
                                {Number(r.roas).toFixed(1)}x
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita */}
          <div className="space-y-4">

            {/* Equipe */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-4">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Equipe</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/35">Gestor de Tráfego</p>
                    <p className="text-sm text-white font-medium truncate">{trafficName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Camera className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/35">Social Media</p>
                    <p className="text-sm text-white font-medium truncate">{socialName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Último acesso */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-3">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Acesso do Cliente</h2>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Clock className="h-3.5 w-3.5 text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/35">Último acesso</p>
                  {lastSignIn ? (
                    <>
                      <p className="text-sm text-white font-medium mt-0.5">
                        {formatDistanceToNow(new Date(lastSignIn), { addSuffix: true, locale: ptBR })}
                      </p>
                      <p className="text-xs text-white/30">
                        {format(new Date(lastSignIn), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-white/30 mt-0.5 italic">Nunca acessou</p>
                  )}
                </div>
              </div>
            </div>

            {/* Observações */}
            {clientRow.notes && (
              <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-3">
                <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Observações Internas
                </h2>
                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{clientRow.notes}</p>
              </div>
            )}

            {/* Atalhos */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-3">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Atalhos</h2>
              <div className="space-y-2">
                <Link
                  href="/traffic/dashboard"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:border-[#EACE00]/30 hover:bg-[#EACE00]/5 transition-all group"
                >
                  <BarChart2 className="h-4 w-4 text-[#EACE00]/60 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/70 font-medium group-hover:text-white transition-colors">
                      Dashboard de Tráfego
                    </p>
                    <p className="text-xs text-white/30">Visão geral de campanhas</p>
                  </div>
                </Link>
                <Link
                  href="/admin/calendar"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:border-[#EACE00]/30 hover:bg-[#EACE00]/5 transition-all group"
                >
                  <CalendarDays className="h-4 w-4 text-[#EACE00]/60 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/70 font-medium group-hover:text-white transition-colors">
                      Calendário
                    </p>
                    <p className="text-xs text-white/30">Agenda de publicações</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
