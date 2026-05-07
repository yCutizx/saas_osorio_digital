import { Suspense } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PlusCircle, Calendar, Clock, CheckCircle2, Send, ChevronLeft, Users } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { CalendarGrid, type CalendarPost, type PostsByDate } from '@/components/calendar/calendar-grid'

type Client = { id: string; name: string }

// ── fetch clients ────────────────────────────────────────────────────────────
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

// ── fetch calendar data for a specific client ────────────────────────────────
async function fetchCalendarData(clientId: string, month: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  // verify access: non-admin must have this client assigned
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

  const all = posts ?? []
  const stats = {
    total:     all.length,
    pending:   all.filter((p) => p.status === 'pending_approval').length,
    approved:  all.filter((p) => p.status === 'approved').length,
    published: all.filter((p) => p.status === 'published').length,
  }

  return { client: clientRow, postsByDate, stats, role: profile?.role ?? '' }
}

// ── page ─────────────────────────────────────────────────────────────────────
interface PageProps {
  searchParams: { month?: string; client?: string }
}

export default async function SocialDashboardPage({ searchParams }: PageProps) {
  const currentMonth = searchParams.month ?? format(new Date(), 'yyyy-MM')
  const clientId     = searchParams.client

  // ── Client picker view ───────────────────────────────────────────────────
  if (!clientId) {
    const { clients } = await fetchClients()

    return (
      <AppLayout pageTitle="Calendário Editorial">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white">Calendário Editorial</h1>
            <p className="text-white/40 text-sm mt-0.5">
              Selecione um cliente para ver o calendário de posts
            </p>
          </div>

          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Users className="h-8 w-8 text-white/20" />
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
      </AppLayout>
    )
  }

  // ── Calendar view ────────────────────────────────────────────────────────
  const data = await fetchCalendarData(clientId, currentMonth)
  if (!data) return null

  const { client, postsByDate, stats, role } = data
  const canEdit    = ['admin', 'social_media'].includes(role)
  const monthLabel = format(new Date(`${currentMonth}-01T12:00:00`), 'MMMM yyyy', { locale: ptBR })

  const statCards = [
    { label: 'Posts no Mês', value: stats.total,     icon: Calendar,     color: 'text-[#EACE00]',  bg: 'bg-[#EACE00]/10',   border: 'border-[#EACE00]/15' },
    { label: 'Aguardando',   value: stats.pending,    icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-400/10',  border: 'border-yellow-400/15' },
    { label: 'Aprovados',    value: stats.approved,   icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-400/10',   border: 'border-green-400/15' },
    { label: 'Publicados',   value: stats.published,  icon: Send,         color: 'text-blue-400',   bg: 'bg-blue-400/10',    border: 'border-blue-400/15' },
  ]

  return (
    <AppLayout pageTitle="Calendário Editorial">
      <div className="space-y-5">

        {/* Breadcrumb + ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
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
            <span className="text-white/40 text-sm">{monthLabel}</span>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-2xl bg-[#111] border ${card.border} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#888] uppercase tracking-wider">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-black ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Calendário */}
        <div className="rounded-2xl bg-[#111] border border-[#222] p-4 lg:p-6">
          <Suspense fallback={
            <div className="h-96 flex items-center justify-center text-white/30 text-sm">
              Carregando calendário...
            </div>
          }>
            <CalendarGrid
              currentMonth={currentMonth}
              postsByDate={postsByDate}
              baseHref="/social"
              canCreate={canEdit}
            />
          </Suspense>
        </div>

      </div>
    </AppLayout>
  )
}
