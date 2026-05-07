import { Suspense } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, PlusCircle, Calendar, Clock, CheckCircle2, Send } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarGrid, type CalendarPost, type PostsByDate } from '@/components/calendar/calendar-grid'

interface PageProps {
  params:       Promise<{ id: string }>
  searchParams: { month?: string }
}

export default async function CustomCalendarPage({ params, searchParams }: PageProps) {
  const { id: calendarId } = await params
  const currentMonth       = searchParams.month ?? format(new Date(), 'yyyy-MM')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const admin = createAdminClient()

  // Verify access
  if (!isAdmin) {
    const { data: membership } = await admin
      .from('custom_calendar_members')
      .select('user_id')
      .eq('calendar_id', calendarId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) redirect('/social/dashboard')
  }

  const { data: calendar } = await admin
    .from('custom_calendars')
    .select('id, name')
    .eq('id', calendarId)
    .single()

  if (!calendar) notFound()

  const monthDate = new Date(`${currentMonth}-01T12:00:00`)
  const start     = format(startOfMonth(monthDate), 'yyyy-MM-dd')
  const end       = format(endOfMonth(monthDate), 'yyyy-MM-dd')
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: ptBR })

  const { data: posts } = await admin
    .from('custom_calendar_posts')
    .select('id, title, platform, status, scheduled_at')
    .eq('calendar_id', calendarId)
    .gte('scheduled_at', `${start}T00:00:00`)
    .lte('scheduled_at', `${end}T23:59:59`)
    .order('scheduled_at', { ascending: true })

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

  const baseHref = `/social/calendar/custom/${calendarId}`
  const statCards = [
    { label: 'Posts no Mês', value: stats.total,     icon: Calendar,     color: 'text-[#EACE00]',  bg: 'bg-[#EACE00]/10',   border: 'border-[#EACE00]/15' },
    { label: 'Aguardando',   value: stats.pending,    icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-400/10',  border: 'border-yellow-400/15' },
    { label: 'Aprovados',    value: stats.approved,   icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-400/10',   border: 'border-green-400/15' },
    { label: 'Publicados',   value: stats.published,  icon: Send,         color: 'text-blue-400',   bg: 'bg-blue-400/10',    border: 'border-blue-400/15' },
  ]

  return (
    <AppLayout pageTitle={calendar.name}>
      <div className="space-y-5">

        {/* Breadcrumb + ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/social/dashboard" className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Calendário
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white font-semibold text-sm">{calendar.name}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-sm">{monthLabel}</span>
          </div>
          <Link
            href={`${baseHref}/posts/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#EACE00]/90 transition-colors text-sm shrink-0 shadow-[0_4px_16px_rgba(234,206,0,0.2)]"
          >
            <PlusCircle className="h-4 w-4" />
            Novo Post
          </Link>
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
              baseHref={baseHref}
              navBase={baseHref}
              canCreate
            />
          </Suspense>
        </div>

      </div>
    </AppLayout>
  )
}
