import { Suspense } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, startOfDay, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PlusCircle, Calendar, Clock, CheckCircle2, Send, ChevronLeft, Users, XCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarGrid, type CalendarPost, type PostsByDate } from '@/components/calendar/calendar-grid'
import { CustomCalendarsSection } from './custom-calendars-section'
import { cn } from '@/lib/utils'

type Client = { id: string; name: string }
type StaffMember = { id: string; full_name: string | null; email: string; role: string }
type RawPost = { id: string; title: string; platform: string; status: string; scheduled_at: string | null }

const STATUS_CFG: Record<string, { label: string; dot: string; chip: string }> = {
  draft:            { label: 'Planejado',         dot: 'bg-[#555555]', chip: 'bg-white/8 text-white/40'               },
  pending_approval: { label: 'Aguard. aprovação', dot: 'bg-[#EACE00]', chip: 'bg-yellow-500/20 text-yellow-400'       },
  approved:         { label: 'Aprovado',          dot: 'bg-[#22C55E]', chip: 'bg-green-500/20 text-green-400'         },
  rejected:         { label: 'Reprovado',         dot: 'bg-[#EF4444]', chip: 'bg-red-500/20 text-red-400'             },
  published:        { label: 'Publicado',         dot: 'bg-[#3B82F6]', chip: 'bg-blue-500/20 text-blue-400'           },
}

const PLATFORM_ABBR: Record<string, string> = {
  instagram: 'IG', facebook: 'FB', tiktok: 'TT', linkedin: 'LI', twitter: 'TW',
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', twitter: 'Twitter',
}

// ── fetch clients ─────────────────────────────────────────────────────────────
async function fetchClients(): Promise<{ clients: Client[]; role: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { clients: [], role: '' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  let query = supabase.from('clients').select('id, name').eq('active', true).order('name')

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length === 0) return { clients: [], role: profile?.role ?? '' }
    query = query.in('id', ids)
  }

  const { data: clients } = await query
  return { clients: clients ?? [], role: profile?.role ?? '' }
}

// ── fetch calendar data ───────────────────────────────────────────────────────
async function fetchCalendarData(clientId: string, month: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    const { data: assignment } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id).eq('client_id', clientId).maybeSingle()
    if (!assignment) return null
  }

  const { data: clientRow } = await supabase
    .from('clients').select('id, name').eq('id', clientId).single()
  if (!clientRow) return null

  const monthDate = new Date(`${month}-01T12:00:00`)
  const start     = format(startOfMonth(monthDate), 'yyyy-MM-dd')
  const end       = format(endOfMonth(monthDate), 'yyyy-MM-dd')

  const { data: posts } = await supabase
    .from('content_posts')
    .select('id, title, platform, status, scheduled_at')
    .eq('client_id', clientId)
    .gte('scheduled_at', `${start}T00:00:00`)
    .lte('scheduled_at', `${end}T23:59:59`)
    .order('scheduled_at', { ascending: true })

  const postsByDate: PostsByDate = {}
  for (const post of posts ?? []) {
    if (!post.scheduled_at) continue
    const dateKey = post.scheduled_at.slice(0, 10)
    if (!postsByDate[dateKey]) postsByDate[dateKey] = []
    postsByDate[dateKey].push({
      id: post.id, title: post.title,
      platform: post.platform,
      status: post.status as CalendarPost['status'],
      scheduled_at: post.scheduled_at,
    })
  }

  const all: RawPost[] = posts ?? []
  const stats = {
    total:     all.length,
    pending:   all.filter((p) => p.status === 'pending_approval').length,
    approved:  all.filter((p) => p.status === 'approved').length,
    published: all.filter((p) => p.status === 'published').length,
    rejected:  all.filter((p) => p.status === 'rejected').length,
  }

  return { client: clientRow, postsByDate, posts: all, stats, role: profile?.role ?? '' }
}

// ── fetch custom calendars ────────────────────────────────────────────────────
async function fetchCustomCalendars(role: string, userId: string) {
  const admin = createAdminClient()

  let calQuery = admin
    .from('custom_calendars')
    .select('id, name, created_at, custom_calendar_members(user_id, profiles(id, full_name, email, role))')
    .order('created_at', { ascending: false })

  if (role !== 'admin') {
    const { data: memberships } = await admin
      .from('custom_calendar_members').select('calendar_id').eq('user_id', userId)
    const ids = (memberships ?? []).map((m) => m.calendar_id)
    if (ids.length === 0) return { calendars: [], allStaff: [] }
    calQuery = calQuery.in('id', ids)
  }

  const { data: calendars } = await calQuery

  let allStaff: StaffMember[] = []
  if (role === 'admin') {
    const { data: staff } = await admin
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'traffic_manager', 'social_media'])
      .eq('active', true)
      .order('full_name')
    allStaff = (staff ?? []) as StaffMember[]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { calendars: (calendars ?? []) as any[], allStaff }
}

// ── page ──────────────────────────────────────────────────────────────────────
interface PageProps {
  searchParams: { month?: string; client?: string }
}

export default async function SocialDashboardPage({ searchParams }: PageProps) {
  const currentMonth = searchParams.month ?? format(new Date(), 'yyyy-MM')
  const clientId     = searchParams.client

  // ── Client picker view ────────────────────────────────────────────────────
  if (!clientId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { clients, role } = await fetchClients()
    const { calendars, allStaff } = user
      ? await fetchCustomCalendars(role, user.id)
      : { calendars: [], allStaff: [] }
    const isAdmin = role === 'admin'

    return (
      <AppLayout pageTitle="Calendário Editorial">
        <div className="space-y-10">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-white">Calendário Editorial</h1>
              <p className="text-white/40 text-sm mt-0.5">Selecione um cliente para ver o calendário de posts</p>
            </div>

            {clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed border-white/8 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Users className="h-7 w-7 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">Nenhum cliente atribuído.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/social/dashboard?client=${client.id}`}
                    className="group flex items-center gap-4 p-5 bg-[#0d0d0d] border border-[#222] rounded-2xl hover:border-[#EACE00]/40 hover:bg-[#EACE00]/[0.03] transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#EACE00]/15 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-[#EACE00]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm group-hover:text-[#EACE00] transition-colors truncate">
                        {client.name}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5">Ver calendário</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#1a1a1a]" />

          <CustomCalendarsSection
            calendars={calendars}
            allStaff={allStaff}
            isAdmin={isAdmin}
          />
        </div>
      </AppLayout>
    )
  }

  // ── Calendar view ─────────────────────────────────────────────────────────
  const data = await fetchCalendarData(clientId, currentMonth)
  if (!data) return null

  const { client, postsByDate, posts, stats, role } = data
  const canEdit    = ['admin', 'social_media'].includes(role)
  const monthLabel = format(new Date(`${currentMonth}-01T12:00:00`), 'MMMM yyyy', { locale: ptBR })

  // Próximos posts (a partir de hoje, max 5)
  const todayStart = startOfDay(new Date())
  const upcoming = posts
    .filter((p) => p.scheduled_at && new Date(p.scheduled_at) >= todayStart)
    .slice(0, 5)

  // Distribuição por canal
  const channelCount: Record<string, number> = {}
  for (const post of posts) {
    const platforms = (post.platform ?? '').split(',').filter(Boolean)
    for (const p of platforms) channelCount[p] = (channelCount[p] ?? 0) + 1
  }
  const totalMentions = Object.values(channelCount).reduce((a, b) => a + b, 0) || 1
  const channels = ['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter']
    .map((key) => ({ key, label: PLATFORM_LABEL[key] ?? key, count: channelCount[key] ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

  // Contagem por status (para legenda)
  const statusCount: Record<string, number> = {}
  for (const post of posts) statusCount[post.status] = (statusCount[post.status] ?? 0) + 1

  const statCards = [
    { label: 'Posts no Mês', value: stats.total,    icon: Calendar,     color: 'text-[#EACE00]',  bg: 'bg-[#EACE00]/10',  border: 'border-[#EACE00]/15'  },
    { label: 'Aguardando',   value: stats.pending,   icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/15' },
    { label: 'Aprovados',    value: stats.approved,  icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/15'  },
    { label: 'Publicados',   value: stats.published, icon: Send,         color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/15'   },
    { label: 'Reprovados',   value: stats.rejected,  icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/15'    },
  ]

  return (
    <AppLayout pageTitle="Calendário Editorial">
      <div className="space-y-5">

        {/* Breadcrumb + ação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/social/dashboard"
              className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Calendário
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white font-semibold text-sm">{client.name}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-sm capitalize">{monthLabel}</span>
          </div>

          {canEdit && (
            <Link
              href={`/social/posts/new?client=${client.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#EACE00]/90 transition-colors text-sm shrink-0 shadow-[0_4px_16px_rgba(234,206,0,0.2)]"
            >
              <PlusCircle className="h-4 w-4" />
              Novo Post
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className={cn('rounded-2xl bg-[#111] border p-4', card.border)}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-[#666] uppercase tracking-wider leading-tight">{card.label}</span>
                <div className={cn('p-1.5 rounded-lg shrink-0', card.bg)}>
                  <card.icon className={cn('h-3.5 w-3.5', card.color)} />
                </div>
              </div>
              <p className={cn('text-3xl font-black', card.color)}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Layout principal: calendário + painel lateral */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">

          {/* Calendário */}
          <div className="flex-1 min-w-0 rounded-2xl bg-[#111] border border-[#222] p-4 lg:p-5">
            <Suspense fallback={
              <div className="h-96 flex items-center justify-center text-white/30 text-sm">
                Carregando calendário...
              </div>
            }>
              <CalendarGrid
                currentMonth={currentMonth}
                postsByDate={postsByDate}
                baseHref="/social"
                clientId={client.id}
                canCreate={canEdit}
              />
            </Suspense>
          </div>

          {/* Painel lateral */}
          <div className="w-full xl:w-[272px] shrink-0 space-y-4">

            {/* Legenda de status */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-4 space-y-3">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Status</p>
              <div className="space-y-2.5">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                      <span className="text-sm text-white/60">{cfg.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-white/80 tabular-nums">
                      {statusCount[key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximos posts */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-4 space-y-3">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Próximos posts</p>
              {upcoming.length === 0 ? (
                <p className="text-sm text-white/25">Nenhum post agendado.</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((post) => {
                    const cfg = STATUS_CFG[post.status] ?? STATUS_CFG.draft
                    const dateObj = post.scheduled_at ? new Date(post.scheduled_at) : null
                    const dateLabel = dateObj && isValid(dateObj)
                      ? format(dateObj, "d MMM", { locale: ptBR }).toUpperCase()
                      : '—'
                    const platforms = (post.platform ?? '').split(',').filter(Boolean)
                    return (
                      <Link
                        key={post.id}
                        href={`/social/posts/${post.id}`}
                        className="flex items-start gap-3 group"
                      >
                        <div className="shrink-0 text-center w-10 mt-0.5">
                          <span className="text-[10px] font-bold text-[#EACE00] leading-none block">{dateLabel}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 truncate group-hover:text-white transition-colors leading-snug">
                            {post.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {platforms.slice(0, 3).map((p) => (
                              <span key={p} className="text-[10px] font-bold text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                                {PLATFORM_ABBR[p] ?? p.toUpperCase().slice(0, 2)}
                              </span>
                            ))}
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', cfg.chip)}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Distribuição por canal */}
            {channels.length > 0 && (
              <div className="rounded-2xl bg-[#111] border border-[#222] p-4 space-y-3">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Por canal</p>
                <div className="space-y-3">
                  {channels.map((ch) => {
                    const pct = Math.round((ch.count / totalMentions) * 100)
                    return (
                      <div key={ch.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">{ch.label}</span>
                          <span className="text-white/40 tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#EACE00]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </AppLayout>
  )
}
