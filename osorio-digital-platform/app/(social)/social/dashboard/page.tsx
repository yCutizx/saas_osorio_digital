import { Suspense } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { PlusCircle, Calendar, Clock, CheckCircle2, Send } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { CalendarGrid, type CalendarPost, type PostsByDate } from '@/components/calendar/calendar-grid'
import { SocialFilters } from './social-filters'

async function fetchSocialData(month: string, clientId?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  let clientsQuery = supabase.from('clients').select('id, name').eq('active', true).order('name')
  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length === 0) return { clients: [], postsByDate: {} as PostsByDate, stats: null, profile }
    clientsQuery = clientsQuery.in('id', ids)
  }
  const { data: clients } = await clientsQuery

  const monthDate = new Date(`${month}-01T12:00:00`)
  const start     = format(startOfMonth(monthDate), 'yyyy-MM-dd')
  const end       = format(endOfMonth(monthDate), 'yyyy-MM-dd')

  let postsQuery = supabase
    .from('content_posts')
    .select('id, title, platform, status, scheduled_at, client_id')
    .gte('scheduled_at', `${start}T00:00:00`)
    .lte('scheduled_at', `${end}T23:59:59`)
    .order('scheduled_at', { ascending: true })

  if (clientId) {
    postsQuery = postsQuery.eq('client_id', clientId)
  } else if (profile?.role !== 'admin' && clients?.length) {
    postsQuery = postsQuery.in('client_id', clients.map((c) => c.id))
  }

  const { data: posts } = await postsQuery

  const postsByDate: PostsByDate = {}
  for (const post of posts ?? []) {
    if (!post.scheduled_at) continue
    const dateKey = post.scheduled_at.slice(0, 10)
    if (!postsByDate[dateKey]) postsByDate[dateKey] = []
    postsByDate[dateKey].push({
      id:           post.id,
      title:        post.title,
      platform:     post.platform,
      status:       post.status as CalendarPost['status'],
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

  return { clients: clients ?? [], postsByDate, stats, profile }
}

interface PageProps {
  searchParams: { month?: string; client?: string }
}

export default async function SocialDashboardPage({ searchParams }: PageProps) {
  const currentMonth = searchParams.month ?? format(new Date(), 'yyyy-MM')
  const clientId     = searchParams.client

  const data = await fetchSocialData(currentMonth, clientId)
  if (!data) return null

  const { clients, postsByDate, stats, profile } = data
  const canEdit = ['admin', 'social_media'].includes(profile?.role ?? '')

  const statCards = [
    { label: 'Posts no Mês', value: stats?.total     ?? 0, icon: Calendar,     color: 'text-[#EACE00]',  bg: 'bg-[#EACE00]/10',   border: 'border-[#EACE00]/15' },
    { label: 'Aguardando',   value: stats?.pending    ?? 0, icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-400/10',  border: 'border-yellow-400/15' },
    { label: 'Aprovados',    value: stats?.approved   ?? 0, icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-400/10',   border: 'border-green-400/15' },
    { label: 'Publicados',   value: stats?.published  ?? 0, icon: Send,         color: 'text-blue-400',   bg: 'bg-blue-400/10',    border: 'border-blue-400/15' },
  ]

  return (
    <AppLayout pageTitle="Calendário Editorial">
      <div className="space-y-5">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Suspense fallback={null}>
            <SocialFilters clients={clients} currentClientId={clientId ?? null} />
          </Suspense>
          {canEdit && (
            <Link
              href="/social/posts/new"
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
                <span className="text-xs text-white/40 uppercase tracking-wider">{card.label}</span>
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
