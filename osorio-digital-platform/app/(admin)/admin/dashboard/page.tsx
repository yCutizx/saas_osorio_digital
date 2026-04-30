import Link from 'next/link'
import { Users, TrendingUp, Calendar, Clock, ArrowRight, UserPlus, Lightbulb } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

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

const PLAN_LABELS: Record<string, string>  = { basico: 'Básico', pro: 'Pro', premium: 'Premium' }
const PLAN_COLORS: Record<string, string>  = {
  basico:  'bg-white/10 text-white/60',
  pro:     'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  premium: 'bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30',
}

export default async function AdminDashboardPage() {
  const [stats, recentClients] = await Promise.all([getStats(), getRecentClients()])

  const statCards = [
    {
      label:  'Clientes Ativos',
      value:  stats.clientsCount,
      icon:   Users,
      href:   '/admin/clients',
      accent: 'from-brand-yellow/20 to-brand-yellow/5',
      ring:   'border-brand-yellow/20 hover:border-brand-yellow/40',
      icon_bg:'bg-brand-yellow/15',
      color:  'text-brand-yellow',
      num:    'text-brand-yellow',
    },
    {
      label:  'Membros da Equipe',
      value:  stats.teamCount,
      icon:   Users,
      href:   '#',
      accent: 'from-blue-500/20 to-blue-500/5',
      ring:   'border-blue-500/20 hover:border-blue-500/40',
      icon_bg:'bg-blue-500/15',
      color:  'text-blue-400',
      num:    'text-blue-400',
    },
    {
      label:  'Campanhas Ativas',
      value:  stats.campaignsCount,
      icon:   TrendingUp,
      href:   '/traffic/dashboard',
      accent: 'from-green-500/20 to-green-500/5',
      ring:   'border-green-500/20 hover:border-green-500/40',
      icon_bg:'bg-green-500/15',
      color:  'text-green-400',
      num:    'text-green-400',
    },
    {
      label:  'Posts Aguardando',
      value:  stats.pendingPostsCount,
      icon:   Clock,
      href:   '/social/dashboard',
      accent: 'from-orange-500/20 to-orange-500/5',
      ring:   'border-orange-500/20 hover:border-orange-500/40',
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
              <div className={cn(
                'relative rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200',
                card.accent, card.ring
              )}>
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-2.5 rounded-xl', card.icon_bg)}>
                    <card.icon className={cn('h-4 w-4', card.color)} />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className={cn('text-4xl font-bold tabular-nums', card.num)}>{card.value}</p>
                <p className="text-xs text-white/50 mt-1.5 font-medium">{card.label}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Clientes recentes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-white/60">
                Clientes Recentes
              </h2>
              <Link
                href="/admin/clients"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-yellow transition-colors"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentClients.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-brand-yellow/60" />
                </div>
                <p className="text-white/50 text-sm mb-4">Nenhum cliente cadastrado ainda.</p>
                <Link
                  href="/admin/clients/new"
                  className="inline-flex items-center gap-2 text-sm text-brand-yellow hover:text-brand-yellow/80 transition-colors font-medium"
                >
                  <UserPlus className="h-4 w-4" /> Cadastrar primeiro cliente
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                {recentClients.map((client, idx) => (
                  <Link
                    key={client.id}
                    href={`/admin/clients`}
                    className={cn(
                      'flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors',
                      idx > 0 && 'border-t border-white/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-yellow/15 flex items-center justify-center shrink-0">
                        <span className="text-brand-yellow font-bold text-xs">
                          {client.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.industry ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-medium', PLAN_COLORS[client.plan] ?? PLAN_COLORS.basico)}>
                        {PLAN_LABELS[client.plan] ?? client.plan}
                      </span>
                      <div className={cn('w-2 h-2 rounded-full', client.active ? 'bg-green-400' : 'bg-white/20')} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Ações Rápidas
            </h2>
            <div className="space-y-2.5">
              <Link
                href="/admin/clients/new"
                className="flex items-center gap-3 w-full px-4 py-3.5 bg-brand-yellow text-brand-black font-semibold rounded-xl hover:bg-brand-yellow/90 transition-colors text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Novo Cliente
              </Link>
              <Link
                href="/admin/clients"
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors text-sm"
              >
                <Users className="h-4 w-4" />
                Ver Todos os Clientes
              </Link>
              <Link
                href="/traffic/dashboard"
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors text-sm"
              >
                <TrendingUp className="h-4 w-4" />
                Dashboard de Tráfego
              </Link>
              <Link
                href="/social/dashboard"
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors text-sm"
              >
                <Calendar className="h-4 w-4" />
                Calendário Editorial
              </Link>
              <Link
                href="/admin/insights/new"
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors text-sm"
              >
                <Lightbulb className="h-4 w-4" />
                Publicar Insight
              </Link>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
