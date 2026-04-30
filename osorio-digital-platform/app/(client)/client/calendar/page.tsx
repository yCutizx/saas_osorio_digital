import { Suspense } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { requireMinPlan } from '@/lib/client-plan'
import { ptBR } from 'date-fns/locale'
import { Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { CalendarGrid, type CalendarPost, type PostsByDate } from '@/components/calendar/calendar-grid'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'

async function fetchClientData(month: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'client') redirect('/admin/dashboard')

  // Encontrar o cliente vinculado a este usuário
  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id, clients(name)')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  if (!assignment) return { clientName: '', postsByDate: {} as PostsByDate, pending: [] }

  const clientId  = assignment.client_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (assignment.clients as any)?.name ?? ''

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

  // Agrupar por data
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

  // Posts pendentes para destaque
  const pending = (posts ?? []).filter((p) => p.status === 'pending_approval')

  return { clientName, postsByDate, pending }
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook',
  linkedin: 'LinkedIn', tiktok: 'TikTok', twitter: 'Twitter',
}

interface PageProps {
  searchParams: { month?: string }
}

export default async function ClientCalendarPage({ searchParams }: PageProps) {
  await requireMinPlan('pro')
  const currentMonth = searchParams.month ?? format(new Date(), 'yyyy-MM')
  const { clientName, postsByDate, pending } = await fetchClientData(currentMonth)

  const monthLabel = format(new Date(`${currentMonth}-01T12:00:00`), 'MMMM yyyy', { locale: ptBR })

  return (
    <AppLayout pageTitle="Calendário de Posts">
      <div className="space-y-6">

        {clientName && (
          <p className="text-muted-foreground text-sm">
            Visualizando posts de <span className="text-foreground font-medium">{clientName}</span> — {monthLabel}
          </p>
        )}

        {/* Posts aguardando aprovação */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
              <h2 className="text-sm font-semibold text-foreground">
                {pending.length === 1 ? '1 post aguarda' : `${pending.length} posts aguardam`} sua aprovação
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pending.map((post) => (
                <Link
                  key={post.id}
                  href={`/client/posts/${post.id}`}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border border-brand-yellow/30 bg-brand-yellow/5 hover:bg-brand-yellow/10 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {PLATFORM_LABEL[post.platform] ?? post.platform}
                      {post.scheduled_at && ` · ${format(new Date(post.scheduled_at), "d 'de' MMM", { locale: ptBR })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-brand-yellow font-medium">Revisar</span>
                    <ArrowRight className="h-3.5 w-3.5 text-brand-yellow group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Legenda rápida */}
        <div className="flex flex-wrap gap-4">
          {[
            { icon: Clock,        color: 'text-brand-yellow', label: 'Aguardando aprovação' },
            { icon: CheckCircle2, color: 'text-green-400',   label: 'Aprovado' },
            { icon: XCircle,      color: 'text-red-400',     label: 'Reprovado' },
          ].map(({ icon: Icon, color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={cn('h-3.5 w-3.5', color)} />
              {label}
            </div>
          ))}
        </div>

        {/* Calendário */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 lg:p-6">
            <Suspense fallback={
              <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">
                Carregando...
              </div>
            }>
              <CalendarGrid
                currentMonth={currentMonth}
                postsByDate={postsByDate}
                baseHref="/client"
              />
            </Suspense>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  )
}
