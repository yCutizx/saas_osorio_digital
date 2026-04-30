import Link from 'next/link'
import { Users, TrendingUp, Calendar, Clock, ArrowRight, UserPlus, Lightbulb } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()
  const [
    { count: clientsCount },
    { count: teamCount },
    { count: campaignsCount },
    { count: pendingPostsCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['traffic_manager', 'social_media']),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('content_posts').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
  ])
  return {
    clientsCount:      clientsCount      ?? 0,
    teamCount:         teamCount         ?? 0,
    campaignsCount:    campaignsCount    ?? 0,
    pendingPostsCount: pendingPostsCount ?? 0,
  }
}

async function getRecentClients() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select('id, name, industry, plan, active, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

const PLAN_LABELS: Record<string, string> = { basico: 'Básico', pro: 'Pro', premium: 'Premium' }
const PLAN_COLORS: Record<string, string>  = {
  basico:  'bg-white/8 text-white/50',
  pro:     'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  premium: 'bg-[#EACE00]/15 text-[#EACE00] border border-[#EACE00]/25',
}

export default async function AdminDashboardPage() {
  const [stats, recentClients] = await Promise.all([getStats(), getRecentClients()])

  const statCards = [
    {
      label:  'Clientes Ativos',
      value:  stats.clientsCount,
      icon:   Users,
      href:   '/admin/clients',
      border: 'border-[#EACE00]/20 hover:border-[#EACE00]/50',
      glow:   'shadow-[0_0_30px_rgba(234,206,0,0.06)]',
      icon_bg:'bg-[#EACE00]/15',
      color:  'text-[#EACE00]',
      num:    'text-[#EACE00]',
    },
    {
      label:  'Membros da Equipe',
      value:  stats.teamCount,
      icon:   Users,
      href:   '#',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      glow:   'shadow-[0_0_30px_rgba(59,130,246,0.06)]',
      icon_bg:'bg-blue-500/15',
      color:  'text-blue-400',
      num:    'text-blue-400',
    },
    {
      label:  'Campanhas Ativas',
      value:  stats.campaignsCount,
      icon:   TrendingUp,
      href:   '/traffic/campaigns',
      border: 'border-green-500/20 hover:border-green-500/40',
      glow:   'shadow-[0_0_30px_rgba(74,222,128,0.06)]',
      icon_bg:'bg-green-500/15',
      color:  'text-green-400',
      num:    'text-green-400',
    },
    {
      label:  'Posts Aguardando',
      value:  stats.pendingPostsCount,
      icon:   Clock,
      href:   '/social/dashboard',
      border: 'border-orange-500/20 hover:border-orange-500/40',
      glow:   'shadow-[0_0_30px_rgba(251,146,60,0.06)]',
      icon_bg:'bg-orange-500/15',
      color:  'text-orange-400',
      num:    'text-orange-400',
    },
  ]

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-8">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Link key={card.label} href={card.href} className="group">
              <div className={`rounded-2xl bg-[#111] border p-5 transition-all duration-200 ${card.border} ${card.glow}`}>
                <div className="flex items-start justify-between mb-5">
                  <div className={`p-2.5 rounded-xl ${card.icon_bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className={`text-5xl font-black tabular-nums ${card.num}`}>{card.value}</p>
                <p className="text-xs text-white/40 mt-2 font-medium uppercase tracking-wider">{card.label}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Clientes recentes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">
                Clientes Recentes
              </h2>
              <Link
                href="/admin/clients"
                className="flex items-center gap-1 text-xs text-white/40 hover:text-[#EACE00] transition-colors"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentClients.length === 0 ? (
              <div className="rounded-2xl border border-[#222] bg-[#111] p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#EACE00]/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-[#EACE00]/60" />
                </div>
                <p className="text-white/40 text-sm mb-4">Nenhum cliente cadastrado ainda.</p>
                <Link
                  href="/admin/clients/new"
                  className="inline-flex items-center gap-2 text-sm text-[#EACE00] hover:text-[#EACE00]/80 transition-colors font-semibold"
                >
                  <UserPlus className="h-4 w-4" /> Cadastrar primeiro cliente
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#222] bg-[#111] overflow-hidden">
                {recentClients.map((client, idx) => (
                  <Link
                    key={client.id}
                    href="/admin/clients"
                    className={`flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors ${idx > 0 ? 'border-t border-[#1a1a1a]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EACE00]/15 border border-[#EACE00]/20 flex items-center justify-center shrink-0">
                        <span className="text-[#EACE00] font-bold text-xs">
                          {client.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{client.name}</p>
                        <p className="text-xs text-white/35">{client.industry ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PLAN_COLORS[client.plan] ?? PLAN_COLORS.basico}`}>
                        {PLAN_LABELS[client.plan] ?? client.plan}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${client.active ? 'bg-green-400' : 'bg-white/20'}`} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">
              Ações Rápidas
            </h2>
            <div className="space-y-2">
              <Link
                href="/admin/clients/new"
                className="flex items-center gap-3 w-full px-4 py-3.5 bg-[#EACE00] text-black font-bold rounded-xl hover:bg-[#EACE00]/90 transition-colors text-sm shadow-[0_4px_20px_rgba(234,206,0,0.2)]"
              >
                <UserPlus className="h-4 w-4" />
                Novo Cliente
              </Link>
              {[
                { href: '/admin/clients',      icon: Users,      label: 'Ver Todos os Clientes' },
                { href: '/traffic/dashboard',  icon: TrendingUp, label: 'Dashboard de Tráfego' },
                { href: '/social/dashboard',   icon: Calendar,   label: 'Calendário Editorial' },
                { href: '/admin/insights/new', icon: Lightbulb,  label: 'Publicar Insight' },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-[#222] bg-[#111] text-white/50 hover:bg-white/5 hover:text-white hover:border-[#EACE00]/30 transition-all text-sm"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
