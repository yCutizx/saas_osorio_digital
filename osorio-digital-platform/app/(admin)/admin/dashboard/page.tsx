import { createAdminClient } from '@/lib/supabase/admin'
import { AppLayout } from '@/components/layout/app-layout'
import Link from 'next/link'
import {
  Building2, FileCheck2, Clock, Users,
  ArrowRight, ArrowUpRight, ArrowDownRight, UserPlus,
  TrendingUp, Calendar, Lightbulb, Activity, MessageSquare,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import dynamic from 'next/dynamic'
import type { ChartDay } from './dashboard-chart'

const PostsChart = dynamic(
  () => import('./dashboard-chart').then((m) => m.PostsChart),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-white/5 rounded-xl" /> },
)

const PLAN_COLORS: Record<string, string> = {
  basico:  'bg-white/8 text-white/50',
  pro:     'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  premium: 'bg-[#EACE00]/15 text-[#EACE00] border border-[#EACE00]/25',
}
const PLAN_LABELS: Record<string, string> = { basico: 'Básico', pro: 'Pro', premium: 'Premium' }

const STATUS_COLOR: Record<string, string> = {
  published:        '#3b82f6',
  approved:         '#22c55e',
  pending_approval: '#EACE00',
  rejected:         '#ef4444',
  draft:            '#555555',
}

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function variation(current: number, previous: number) {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()

  const now            = new Date()
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thirtyDaysAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo   = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const dow       = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const [
    { count: clientsCount },
    { count: newClientsThisMonth },
    { count: newClientsLastMonth },
    { data: recentClients },
    { count: teamCount },
    { data: posts60 },
    { count: pendingCount },
    { data: weekPostsRaw },
    { data: commentsRaw },
  ] = await Promise.all([
    admin.from('clients').select('*', { count: 'exact', head: true }).eq('active', true),
    admin.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', startThisMonth.toISOString()),
    admin.from('clients').select('*', { count: 'exact', head: true })
      .gte('created_at', startLastMonth.toISOString())
      .lt('created_at', startThisMonth.toISOString()),
    admin.from('clients')
      .select('id, name, industry, plan, active, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'social_media', 'traffic_manager']),
    admin.from('content_posts')
      .select('id, title, status, created_at, client_id, clients(name)')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    admin.from('content_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval'),
    admin.from('content_posts')
      .select('scheduled_at, status')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', weekStart.toISOString())
      .lte('scheduled_at', weekEnd.toISOString()),
    admin.from('post_comments')
      .select('id, content, created_at, user_id, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const posts    = posts60      ?? []
  const weekPosts = weekPostsRaw ?? []
  const comments  = commentsRaw  ?? []
  const clients5  = recentClients ?? []

  // ── Published metrics ──────────────────────────────────────────────
  const publishedThisMonth = posts.filter(
    (p) => p.status === 'published' && new Date(p.created_at) >= startThisMonth,
  ).length
  const publishedLastMonth = posts.filter(
    (p) =>
      p.status === 'published' &&
      new Date(p.created_at) >= startLastMonth &&
      new Date(p.created_at) < startThisMonth,
  ).length

  const clientVar   = variation(newClientsThisMonth ?? 0, newClientsLastMonth ?? 0)
  const publishedVar = variation(publishedThisMonth, publishedLastMonth)

  // ── Chart data — last 30 days ──────────────────────────────────────
  const dayMap = new Map<string, ChartDay>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, {
      date:      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      created:   0,
      approved:  0,
      published: 0,
    })
  }
  for (const post of posts) {
    if (new Date(post.created_at) < thirtyDaysAgo) continue
    const day = dayMap.get(post.created_at.slice(0, 10))
    if (!day) continue
    day.created++
    if (post.status === 'approved' || post.status === 'published') day.approved++
    if (post.status === 'published') day.published++
  }
  const chartData = Array.from(dayMap.values())

  // ── Top clients this month ─────────────────────────────────────────
  const clientCounts = new Map<string, { name: string; count: number }>()
  for (const post of posts.filter((p) => new Date(p.created_at) >= startThisMonth)) {
    if (!post.client_id) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name   = (post.clients as any)?.name ?? 'Desconhecido'
    const entry  = clientCounts.get(post.client_id)
    if (entry) entry.count++
    else clientCounts.set(post.client_id, { name, count: 1 })
  }
  const topClients = Array.from(clientCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxPosts = topClients[0]?.count ?? 1

  // ── Client post map for recent clients list ────────────────────────
  const clientPostMap = new Map<string, number>()
  for (const post of posts.filter((p) => new Date(p.created_at) >= startThisMonth)) {
    if (!post.client_id) continue
    clientPostMap.set(post.client_id, (clientPostMap.get(post.client_id) ?? 0) + 1)
  }

  // ── Week calendar ──────────────────────────────────────────────────
  const weekCalendar = Array.from({ length: 7 }, (_, i) => {
    const d       = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayPosts = weekPosts.filter((p) => p.scheduled_at?.startsWith(dateStr))
    const isToday  = d.toDateString() === now.toDateString()
    const statusMap: Record<string, number> = {}
    for (const p of dayPosts) statusMap[p.status] = (statusMap[p.status] ?? 0) + 1
    const primaryStatus = Object.entries(statusMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'draft'
    return { label: WEEK_LABELS[i], day: d.getDate(), count: dayPosts.length, isToday, primaryStatus }
  })
  const maxDayCount = Math.max(...weekCalendar.map((d) => d.count), 1)

  // ── Activity feed ─────────────────────────────────────────────────
  type ActivityItem = {
    id: string; text: string; subtext: string | null
    initials: string; color: string; time: Date
  }
  const activity: ActivityItem[] = [
    ...posts.slice(0, 15).map((p) => {
      const statusLabel =
        p.status === 'published'        ? 'Post publicado'
        : p.status === 'approved'       ? 'Post aprovado'
        : p.status === 'pending_approval' ? 'Post enviado p/ aprovação'
        : p.status === 'rejected'       ? 'Post reprovado'
        : 'Post criado'
      return {
        id:       p.id,
        text:     `${statusLabel}: "${p.title}"`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subtext:  (p.clients as any)?.name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initials: ((p.clients as any)?.name ?? 'P').slice(0, 2).toUpperCase(),
        color:    STATUS_COLOR[p.status] ?? '#555',
        time:     new Date(p.created_at),
      }
    }),
    ...comments.map((c) => ({
      id:       `c-${c.id}`,
      text:     `Comentário: "${c.content.slice(0, 55)}${c.content.length > 55 ? '…' : ''}"`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtext:  (c.profiles as any)?.full_name ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initials: ((c.profiles as any)?.full_name ?? 'U').slice(0, 2).toUpperCase(),
      color:    '#8b5cf6',
      time:     new Date(c.created_at),
    })),
    ...clients5.slice(0, 3).map((c) => ({
      id:       `cl-${c.id}`,
      text:     `Novo cliente: "${c.name}"`,
      subtext:  c.industry ?? null,
      initials: c.name.slice(0, 2).toUpperCase(),
      color:    '#EACE00',
      time:     new Date(c.created_at),
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 14)

  const activityFeed = activity.map((item) => ({
    ...item,
    relativeTime: formatDistanceToNow(item.time, { locale: ptBR, addSuffix: true }),
  }))

  // ── Render ────────────────────────────────────────────────────────
  return (
    <AppLayout pageTitle="Dashboard Admin">
      <div className="space-y-5">

        {/* ── 1. Metric cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Clientes ativos */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5 space-y-4 hover:border-[#EACE00]/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#EACE00]/12">
                <Building2 className="h-4 w-4 text-[#EACE00]" />
              </div>
              {clientVar ? (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${clientVar.up ? 'text-green-400' : 'text-red-400'}`}>
                  {clientVar.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {clientVar.pct}%
                </span>
              ) : <span className="text-xs text-white/20">—</span>}
            </div>
            <div>
              <p className="text-4xl font-black text-[#EACE00] tabular-nums">{clientsCount ?? 0}</p>
              <p className="text-xs text-white/40 mt-1.5 uppercase tracking-wider font-medium">Clientes Ativos</p>
              <p className="text-[11px] text-white/25 mt-0.5">+{newClientsThisMonth ?? 0} novos este mês</p>
            </div>
          </div>

          {/* Posts publicados este mês */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5 space-y-4 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-500/12">
                <FileCheck2 className="h-4 w-4 text-blue-400" />
              </div>
              {publishedVar ? (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${publishedVar.up ? 'text-green-400' : 'text-red-400'}`}>
                  {publishedVar.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {publishedVar.pct}%
                </span>
              ) : <span className="text-xs text-white/20">—</span>}
            </div>
            <div>
              <p className="text-4xl font-black text-blue-400 tabular-nums">{publishedThisMonth}</p>
              <p className="text-xs text-white/40 mt-1.5 uppercase tracking-wider font-medium">Publicados no Mês</p>
              <p className="text-[11px] text-white/25 mt-0.5">{publishedLastMonth} no mês anterior</p>
            </div>
          </div>

          {/* Posts aguardando aprovação */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5 space-y-4 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-yellow-500/12">
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
              <Link href="/social/dashboard" className="text-[10px] text-white/30 hover:text-[#EACE00] transition-colors">
                Ver →
              </Link>
            </div>
            <div>
              <p className="text-4xl font-black text-yellow-400 tabular-nums">{pendingCount ?? 0}</p>
              <p className="text-xs text-white/40 mt-1.5 uppercase tracking-wider font-medium">Aguardando Aprovação</p>
              <p className="text-[11px] text-white/25 mt-0.5">pendentes agora</p>
            </div>
          </div>

          {/* Membros da equipe */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5 space-y-4 hover:border-green-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-green-500/12">
                <Users className="h-4 w-4 text-green-400" />
              </div>
              <Link href="/admin/team" className="text-[10px] text-white/30 hover:text-[#EACE00] transition-colors">
                Ver →
              </Link>
            </div>
            <div>
              <p className="text-4xl font-black text-green-400 tabular-nums">{teamCount ?? 0}</p>
              <p className="text-xs text-white/40 mt-1.5 uppercase tracking-wider font-medium">Membros da Equipe</p>
              <p className="text-[11px] text-white/25 mt-0.5">admin + social + tráfego</p>
            </div>
          </div>
        </div>

        {/* ── 2. Chart + Top Clients ────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          <div className="xl:col-span-2 bg-[#111] border border-[#222] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Performance últimos 30 dias</h2>
              <div className="flex items-center gap-3 text-[10px] text-white/30">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EACE00]" />Criados</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Aprovados</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Publicados</span>
              </div>
            </div>
            <PostsChart data={chartData} />
          </div>

          {/* Top clients */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Top Clientes</h2>
              <span className="text-[10px] text-white/25">este mês</span>
            </div>
            {topClients.length === 0 ? (
              <p className="text-xs text-white/25 py-6 text-center">Sem posts publicados este mês</p>
            ) : (
              <div className="space-y-4">
                {topClients.map((client, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-white/25 w-3.5 shrink-0">{i + 1}.</span>
                        <p className="text-sm text-white/80 truncate">{client.name}</p>
                      </div>
                      <p className="text-xs text-white/40 shrink-0 tabular-nums">{client.count}</p>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EACE00] rounded-full transition-all"
                        style={{ width: `${(client.count / maxPosts) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Recent clients + Activity feed ────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Recent clients */}
          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Clientes Recentes</h2>
              <Link href="/admin/clients" className="flex items-center gap-1 text-xs text-white/30 hover:text-[#EACE00] transition-colors">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div>
              {clients5.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-xs text-white/25">Nenhum cliente cadastrado</p>
                  <Link href="/admin/clients/new" className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#EACE00] hover:text-[#EACE00]/80 transition-colors">
                    <UserPlus className="h-3 w-3" />Cadastrar primeiro cliente
                  </Link>
                </div>
              ) : clients5.map((client, i) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors group ${i > 0 ? 'border-t border-[#1a1a1a]' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#EACE00]/12 border border-[#EACE00]/20 flex items-center justify-center shrink-0">
                      <span className="text-[#EACE00] text-xs font-bold">{client.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{client.name}</p>
                      <p className="text-[11px] text-white/35">
                        {new Date(client.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        {clientPostMap.get(client.id) ?? 0} post{(clientPostMap.get(client.id) ?? 0) !== 1 ? 's' : ''} no mês
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[client.plan] ?? PLAN_COLORS.basico}`}>
                      {PLAN_LABELS[client.plan] ?? client.plan}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full ${client.active ? 'bg-green-400' : 'bg-white/20'}`} />
                    <ArrowRight className="h-3 w-3 text-white/15 group-hover:text-white/40 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1a1a1a]">
              <Activity className="h-3.5 w-3.5 text-white/30" />
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Atividade Recente</h2>
            </div>
            <div className="divide-y divide-[#1a1a1a] max-h-[380px] overflow-y-auto">
              {activityFeed.length === 0 ? (
                <p className="text-xs text-white/25 text-center py-10">Nenhuma atividade recente</p>
              ) : activityFeed.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold"
                    style={{ background: item.color + '22', color: item.color }}
                  >
                    {item.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/65 leading-relaxed">{item.text}</p>
                    {item.subtext && <p className="text-[10px] text-white/30 mt-0.5">{item.subtext}</p>}
                  </div>
                  <p className="text-[10px] text-white/25 shrink-0 ml-1 whitespace-nowrap">{item.relativeTime}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4 + 5. Week calendar + Quick actions ─────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Mini week calendar */}
          <div className="xl:col-span-2 bg-[#111] border border-[#222] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-white/30" />
                <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Calendário da Semana</h2>
              </div>
              <Link href="/social/dashboard" className="text-[10px] text-white/30 hover:text-[#EACE00] transition-colors">
                Ver calendário →
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekCalendar.map((day) => {
                const barColor = day.isToday
                  ? '#EACE00'
                  : (STATUS_COLOR[day.primaryStatus] ?? '#333')
                return (
                  <div key={day.label} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-semibold uppercase ${day.isToday ? 'text-[#EACE00]' : 'text-white/30'}`}>
                      {day.label}
                    </span>
                    <div className="w-full bg-white/5 rounded-lg overflow-hidden flex items-end justify-center" style={{ height: 72 }}>
                      {day.count > 0 && (
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: `${Math.max(12, (day.count / maxDayCount) * 100)}%`,
                            background: barColor,
                            opacity: day.isToday ? 1 : 0.55,
                          }}
                        />
                      )}
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${day.isToday ? 'text-[#EACE00]' : day.count > 0 ? 'text-white/60' : 'text-white/20'}`}>
                      {day.count > 0 ? day.count : '·'}
                    </span>
                    <span className={`text-[10px] ${day.isToday ? 'text-[#EACE00]/50' : 'text-white/20'}`}>{day.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Ações Rápidas</h2>
            <div className="space-y-2">
              <Link
                href="/admin/clients/new"
                className="flex items-center gap-3 w-full px-4 py-3.5 bg-[#EACE00] text-black font-bold rounded-xl hover:bg-[#f5d800] transition-colors text-sm shadow-[0_4px_20px_rgba(234,206,0,0.2)]"
              >
                <UserPlus className="h-4 w-4" />Novo Cliente
              </Link>
              {[
                { href: '/admin/clients',      icon: Building2,  label: 'Ver Todos os Clientes'  },
                { href: '/traffic/dashboard',  icon: TrendingUp, label: 'Dashboard de Tráfego'   },
                { href: '/social/dashboard',   icon: Calendar,   label: 'Calendário Editorial'    },
                { href: '/admin/team',         icon: Users,      label: 'Gerenciar Equipe'        },
                { href: '/admin/insights/new', icon: Lightbulb,  label: 'Publicar Insight'        },
                { href: '/social/kanban',      icon: MessageSquare, label: 'Quadros Kanban'      },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-[#222] bg-[#111] text-white/50 hover:bg-white/5 hover:text-white hover:border-[#EACE00]/30 transition-all text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0" />
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
