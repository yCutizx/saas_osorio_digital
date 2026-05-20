import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AtSign, AlertCircle } from 'lucide-react'
import { AppLayout }         from '@/components/layout/app-layout'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMinPlan }    from '@/lib/client-plan'
import { InstagramHeroCard, type IGHeroStats } from '@/components/instagram/instagram-hero-card'
import { InstagramCharts, type IGDailyPoint, type IGCTABreakdown } from '@/components/instagram/instagram-charts'

interface PageProps {
  searchParams: { from?: string; to?: string }
}

export default async function ClientInstagramPage({ searchParams }: PageProps) {
  await requireMinPlan('basico')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  const clientId = assignment?.client_id
  if (!clientId) {
    return (
      <AppLayout pageTitle="Instagram">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AtSign className="h-10 w-10 text-white/20 mb-4" />
          <p className="text-white/40 text-sm">Nenhum dado disponível no momento.</p>
        </div>
      </AppLayout>
    )
  }

  const admin = createAdminClient()
  const { data: igAccount } = await admin
    .from('instagram_accounts')
    .select('ig_user_id, ig_username, account_kind, last_period_views, last_period_profile_views, last_period_website_clicks, last_period_total_interactions, last_period_likes, last_period_comments, last_period_shares, last_period_saves, last_period_accounts_engaged')
    .eq('client_id', clientId)
    .eq('is_primary', true)
    .maybeSingle()

  const from = searchParams.from ?? format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const to   = searchParams.to   ?? format(new Date(), 'yyyy-MM-dd')

  const { data: daily } = await admin
    .from('instagram_daily')
    .select('date, reach, follower_count')
    .eq('client_id', clientId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  const rows = daily ?? []

  const stats: IGHeroStats = {
    followers:          rows.length > 0 ? rows[rows.length - 1].follower_count ?? 0 : 0,
    reach:              rows.reduce((s, r) => s + (r.reach ?? 0), 0),
    views:              igAccount?.last_period_views              ?? 0,
    profile_views:      igAccount?.last_period_profile_views      ?? 0,
    website_clicks:     igAccount?.last_period_website_clicks     ?? 0,
    total_interactions: igAccount?.last_period_total_interactions ?? 0,
    likes:              igAccount?.last_period_likes              ?? 0,
    comments:           igAccount?.last_period_comments           ?? 0,
    shares:             igAccount?.last_period_shares             ?? 0,
    saves:              igAccount?.last_period_saves              ?? 0,
    accounts_engaged:   igAccount?.last_period_accounts_engaged   ?? 0,
  }

  const byDate = new Map(rows.map((r) => [r.date.slice(0, 10), r]))
  const dailyData: IGDailyPoint[] = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    const r   = byDate.get(key)
    return {
      date:           format(day, 'dd/MM', { locale: ptBR }),
      impressoes:     0,
      alcance:        r?.reach ?? 0,
      visitas_perfil: 0,
      cliques_link:   0,
      seguidores:     r?.follower_count ?? 0,
    }
  })

  const ctaBreakdown: IGCTABreakdown = { email: 0, telefone: 0, whatsapp: 0, localizacao: 0 }

  return (
    <AppLayout pageTitle="Instagram">
      <div className="space-y-5">
        {!igAccount ? (
          <div className="rounded-2xl bg-[#111] border border-white/5 p-10 text-center">
            <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <AtSign className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Instagram não conectado</h3>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Solicite ao seu gestor que conecte sua conta Instagram pra acompanhar as métricas aqui.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-yellow-500/8 border border-yellow-500/20 p-5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold">Sincronização inicial pendente</p>
              <p className="text-white/50 text-sm mt-0.5">
                Os dados aparecem após a primeira sincronização (até 1 dia).
              </p>
            </div>
          </div>
        ) : (
          <>
            <InstagramHeroCard
              from={from}
              to={to}
              username={igAccount.ig_username}
              stats={stats}
            />
            <InstagramCharts
              dailyData={dailyData}
              ctaBreakdown={ctaBreakdown}
            />
          </>
        )}
      </div>
    </AppLayout>
  )
}
