import { Suspense } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { requireMinPlan } from '@/lib/client-plan'
import { ptBR } from 'date-fns/locale'
import { Clock, CheckCircle2, XCircle, ArrowRight, CheckCheck, FileEdit } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { CalendarGrid, type CalendarPost, type PostsByDate } from '@/components/calendar/calendar-grid'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'
import { type Platform } from '@/types'

const STATUS_ITEMS = [
  { status: 'pending_approval', label: 'Aguardando aprovação', dot: 'bg-[#EACE00]',   icon: Clock },
  { status: 'approved',         label: 'Aprovado',             dot: 'bg-green-400',    icon: CheckCircle2 },
  { status: 'published',        label: 'Publicado',            dot: 'bg-blue-400',     icon: CheckCheck },
  { status: 'rejected',         label: 'Reprovado',            dot: 'bg-red-400',      icon: XCircle },
  { status: 'draft',            label: 'Rascunho',             dot: 'bg-[#555]',       icon: FileEdit },
]

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook',
  linkedin: 'LinkedIn', tiktok: 'TikTok', twitter: 'Twitter',
}

async function fetchClientData(month: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'client') redirect('/admin/dashboard')

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id, clients(name)')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  if (!assignment) return {
    clientName: '', postsByDate: {} as PostsByDate,
    pending: [], upcoming: [], statusCounts: {}, channelEntries: [], maxChannel: 1,
    userId: user.id,
  }

  const clientId   = assignment.client_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (assignment.clients as any)?.name ?? ''

  const monthDate = new Date(`${month}-01T12:00:00`)
  const start     = format(startOfMonth(monthDate), 'yyyy-MM-dd')
  const end       = format(endOfMonth(monthDate), 'yyyy-MM-dd')

  const todayStr = new Date().toISOString().slice(0, 10)

  const [{ data: posts }, { data: upcomingRaw }] = await Promise.all([
    supabase
      .from('content_posts')
      .select('id, title, platforms, status, scheduled_at')
      .eq('client_id', clientId)
      .gte('scheduled_at', `${start}T00:00:00`)
      .lte('scheduled_at', `${end}T23:59:59`)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('content_posts')
      .select('id, title, platforms, status, scheduled_at')
      .eq('client_id', clientId)
      .gte('scheduled_at', `${todayStr}T00:00:00`)
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ])

  // Group month posts by date
  const postsByDate: PostsByDate = {}
  for (const post of posts ?? []) {
    if (!post.scheduled_at) continue
    const dateKey = post.scheduled_at.slice(0, 10)
    if (!postsByDate[dateKey]) postsByDate[dateKey] = []
    postsByDate[dateKey].push({
      id: post.id, title: post.title,
      platforms: post.platforms,
      status: post.status as CalendarPost['status'],
      scheduled_at: post.scheduled_at,
    })
  }

  const pending = (posts ?? []).filter((p) => p.status === 'pending_approval')

  // Status counts from month posts
  const allMonthPosts = Object.values(postsByDate).flat()
  const statusCounts: Record<string, number> = {}
  for (const post of allMonthPosts) {
    statusCounts[post.status] = (statusCounts[post.status] ?? 0) + 1
  }

  // Channel distribution
  const channelCounts: Record<string, number> = {}
  for (const post of allMonthPosts) {
    const platforms = post.platforms ?? []
    for (const p of platforms) channelCounts[p] = (channelCounts[p] ?? 0) + 1
  }
  const channelEntries = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxChannel = channelEntries[0]?.[1] ?? 1

  return { clientName, postsByDate, pending, upcoming: upcomingRaw ?? [], statusCounts, channelEntries, maxChannel, userId: user.id }
}

interface PageProps {
  searchParams: { month?: string }
}

export default async function ClientCalendarPage({ searchParams }: PageProps) {
  await requireMinPlan('pro')
  const currentMonth = searchParams.month ?? format(new Date(), 'yyyy-MM')
  const { clientName, postsByDate, pending, upcoming, statusCounts, channelEntries, maxChannel, userId } =
    await fetchClientData(currentMonth)

  const monthLabel = format(new Date(`${currentMonth}-01T12:00:00`), 'MMMM yyyy', { locale: ptBR })

  return (
    <AppLayout pageTitle="Calendário de Posts">
      <div className="space-y-5">

        {clientName && (
          <p className="text-[#888] text-sm">
            Visualizando posts de <span className="text-white font-medium">{clientName}</span> — {monthLabel}
          </p>
        )}

        {/* Posts aguardando aprovação */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#EACE00] animate-pulse" />
              <h2 className="text-sm font-semibold text-white">
                {pending.length === 1 ? '1 post aguarda' : `${pending.length} posts aguardam`} sua aprovação
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pending.map((post) => (
                <Link
                  key={post.id}
                  href={`/client/posts/${post.id}`}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#EACE00]/30 bg-[#EACE00]/5 hover:bg-[#EACE00]/10 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{post.title}</p>
                    <p className="text-xs text-[#888] mt-0.5">
                      {(post.platforms as string[] ?? []).map((p: string) => PLATFORM_LABEL[p as Platform] ?? p).join(', ')}
                      {post.scheduled_at && ` · ${new Date(post.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#EACE00] font-medium">Revisar</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#EACE00] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Calendário + painel lateral */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">

          {/* Calendário */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Legenda rápida */}
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Clock,        color: 'text-[#EACE00]', label: 'Aguardando aprovação' },
                { icon: CheckCircle2, color: 'text-green-400',   label: 'Aprovado' },
                { icon: XCircle,      color: 'text-red-400',     label: 'Reprovado' },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-[#888]">
                  <Icon className={cn('h-3.5 w-3.5', color)} />
                  {label}
                </div>
              ))}
            </div>

            <Card className="bg-[#111] border-[#222]">
              <CardContent className="p-4 lg:p-6">
                <Suspense fallback={
                  <div className="h-96 flex items-center justify-center text-[#888] text-sm">
                    Carregando...
                  </div>
                }>
                  <CalendarGrid
                    currentMonth={currentMonth}
                    postsByDate={postsByDate}
                    baseHref="/client"
                    currentUserId={userId}
                    realtimeTable="content_posts"
                  />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Painel lateral direito */}
          <div className="xl:w-64 shrink-0 space-y-4">

            {/* Legenda de status */}
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Status do mês</p>
              {STATUS_ITEMS.map(({ status, label, dot }) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <span className="text-xs text-white/60">{label}</span>
                  </div>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {statusCounts[status] ?? 0}
                  </span>
                </div>
              ))}
              {Object.values(statusCounts).reduce((a, b) => a + b, 0) === 0 && (
                <p className="text-xs text-white/20 text-center py-1">Sem posts este mês</p>
              )}
            </div>

            {/* Próximos posts */}
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Próximos posts</p>
              {upcoming.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-2">Nenhum post agendado</p>
              ) : upcoming.map((post) => (
                <Link
                  key={post.id}
                  href={`/client/posts/${post.id}`}
                  className="flex items-start gap-2 group"
                >
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 bg-[#EACE00]/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 group-hover:text-white transition-colors leading-snug truncate">
                      {post.title}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {post.scheduled_at
                        ? new Date(post.scheduled_at).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Distribuição por canal */}
            {channelEntries.length > 0 && (
              <div className="bg-[#111] border border-[#222] rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Por canal</p>
                {channelEntries.map(([platform, count]) => (
                  <div key={platform} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">{PLATFORM_LABEL[platform] ?? platform}</span>
                      <span className="text-xs font-bold text-white tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EACE00] rounded-full transition-all"
                        style={{ width: `${(count / maxChannel) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
