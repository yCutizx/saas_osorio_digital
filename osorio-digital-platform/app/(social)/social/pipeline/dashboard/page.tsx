import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PipelineBarChart } from '@/components/charts/pipeline-bar-chart'
import { PipelinePieChart } from '@/components/charts/pipeline-pie-chart'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, DollarSign, CheckCircle, BarChart2, Phone, Mail, MessageCircle, Video, FileText } from 'lucide-react'

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call:      <Phone className="h-3.5 w-3.5" />,
  email:     <Mail className="h-3.5 w-3.5" />,
  whatsapp:  <MessageCircle className="h-3.5 w-3.5" />,
  meeting:   <Video className="h-3.5 w-3.5" />,
  note:      <FileText className="h-3.5 w-3.5" />,
}

const ACTIVITY_LABELS: Record<string, string> = {
  call:      'Ligação',
  email:     'Email',
  whatsapp:  'WhatsApp',
  meeting:   'Reunião',
  note:      'Nota',
}

export default async function SocialPipelineDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'social_media'].includes(profile.role)) {
    redirect('/social/dashboard')
  }

  const admin = createAdminClient()

  const { data: stages } = await admin
    .from('pipeline_stages_agency')
    .select('id, name, order, color')
    .order('order', { ascending: true })

  const { data: allLeads } = await admin
    .from('pipeline_leads')
    .select('id, stage, estimated_value, source, updated_at')

  const leads = allLeads ?? []
  const stagesData = stages ?? []

  const totalLeads = leads.length
  const totalNegotiationValue = leads
    .filter((l) => !['Fechado', 'Perdido'].includes(l.stage))
    .reduce((acc, l) => acc + (l.estimated_value ?? 0), 0)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const closedThisMonth = leads.filter(
    (l) => l.stage === 'Fechado' && l.updated_at >= startOfMonth
  ).length

  const totalClosed = leads.filter((l) => l.stage === 'Fechado').length
  const conversionRate = totalLeads > 0 ? Math.round((totalClosed / totalLeads) * 100) : 0

  const barData = stagesData.map((s) => ({
    stage: s.name,
    count: leads.filter((l) => l.stage === s.name).length,
    color: s.color,
  }))

  const sourceMap: Record<string, number> = {}
  for (const lead of leads) {
    sourceMap[lead.source] = (sourceMap[lead.source] ?? 0) + 1
  }
  const pieData = Object.entries(sourceMap).map(([source, count]) => ({ source, count }))

  const { data: recentActivities } = await admin
    .from('pipeline_activities')
    .select('id, type, description, scheduled_at, done, created_at, lead:pipeline_leads(name), user:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(10)

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))

  return (
    <AppLayout pageTitle="Pipeline Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard — Pipeline</h1>
            <p className="text-white/40 text-sm mt-0.5">Visão geral do funil de vendas</p>
          </div>
          <Link
            href="/social/pipeline"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#333] text-white/50 text-sm hover:text-white hover:border-[#555] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Funil
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#EACE00]" />
              <span className="text-[#888] text-xs">Total de Leads</span>
            </div>
            <p className="text-white text-2xl font-bold">{totalLeads}</p>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-[#EACE00]" />
              <span className="text-[#888] text-xs">Em Negociação</span>
            </div>
            <p className="text-[#EACE00] text-xl font-bold">
              {fmtCurrency(totalNegotiationValue)}
            </p>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-[#EACE00]" />
              <span className="text-[#888] text-xs">Fechados este mês</span>
            </div>
            <p className="text-white text-2xl font-bold">{closedThisMonth}</p>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-[#EACE00]" />
              <span className="text-[#888] text-xs">Taxa de Conversão</span>
            </div>
            <p className="text-[#EACE00] text-2xl font-bold">{conversionRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Leads por Estágio</h2>
            <PipelineBarChart data={barData} />
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Leads por Fonte</h2>
            <PipelinePieChart data={pieData} />
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Atividades Recentes</h2>
          {(!recentActivities || recentActivities.length === 0) ? (
            <p className="text-[#555] text-sm text-center py-8">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((act) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const lead = act.lead as any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const actUser = act.user as any
                return (
                  <div key={act.id} className="flex gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                    <div className="mt-0.5 text-[#888]">
                      {ACTIVITY_ICONS[act.type] ?? <FileText className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${act.done ? 'line-through text-[#555]' : 'text-white'}`}>
                        {act.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#555] text-xs">
                          {ACTIVITY_LABELS[act.type] ?? act.type}
                        </span>
                        {lead?.name && (
                          <span className="text-[#555] text-xs">· {lead.name}</span>
                        )}
                        {actUser?.full_name && (
                          <span className="text-[#555] text-xs">· {actUser.full_name}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[#555] text-xs shrink-0">{fmtDate(act.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
