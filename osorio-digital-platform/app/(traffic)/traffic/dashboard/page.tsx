import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, Calendar, Megaphone } from 'lucide-react'
import { AppLayout }         from '@/components/layout/app-layout'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect }          from 'next/navigation'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function TrafficDashboardPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const role = profile?.role ?? ''

  // traffic_manager and admin see ALL clients; social_media sees only assigned
  let clients: { id: string; name: string }[] = []

  if (role === 'admin' || role === 'traffic_manager') {
    const { data } = await admin
      .from('clients').select('id, name').eq('active', true).order('name')
    clients = data ?? []
  } else {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a: { client_id: string }) => a.client_id)
    if (ids.length > 0) {
      const { data } = await admin
        .from('clients').select('id, name').eq('active', true).in('id', ids).order('name')
      clients = data ?? []
    }
  }

  const clientIds = clients.map((c) => c.id)
  const placeholder = ['00000000-0000-0000-0000-000000000000']

  // Campaign count + last report per client
  const [{ data: allCampaigns }, { data: allReports }] = await Promise.all([
    admin
      .from('campaigns')
      .select('client_id')
      .in('client_id', clientIds.length ? clientIds : placeholder),
    admin
      .from('traffic_reports')
      .select('client_id, period_start')
      .in('client_id', clientIds.length ? clientIds : placeholder)
      .order('period_start', { ascending: false }),
  ])

  const campaignCountMap = new Map<string, number>()
  for (const c of allCampaigns ?? []) {
    campaignCountMap.set(c.client_id, (campaignCountMap.get(c.client_id) ?? 0) + 1)
  }

  const lastReportMap = new Map<string, string>()
  for (const r of allReports ?? []) {
    if (!lastReportMap.has(r.client_id)) lastReportMap.set(r.client_id, r.period_start)
  }

  return (
    <AppLayout pageTitle="Gestão de Tráfego">
      <div className="space-y-6">

        <p className="text-sm text-[#888]">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} — selecione para ver o dashboard de tráfego
        </p>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Nenhum cliente disponível</h3>
            <p className="text-white/40 text-sm">
              {role === 'social_media'
                ? 'Você ainda não está atribuído a nenhum cliente.'
                : 'Nenhum cliente ativo cadastrado.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((client) => {
              const campaigns = campaignCountMap.get(client.id) ?? 0
              const lastDate  = lastReportMap.get(client.id)
              const initials  = client.name
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              return (
                <Link
                  key={client.id}
                  href={`/traffic/dashboard/${client.id}`}
                  className="flex flex-col bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#EACE00]/30 transition-colors group"
                >
                  {/* Avatar + nome */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#EACE00]/10 border border-[#EACE00]/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#EACE00]">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate group-hover:text-[#EACE00] transition-colors">
                        {client.name}
                      </h3>
                    </div>
                    <TrendingUp className="h-4 w-4 text-white/15 group-hover:text-[#EACE00]/50 transition-colors shrink-0" />
                  </div>

                  {/* Métricas resumidas */}
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1.5">
                      <Megaphone className="h-3 w-3" />
                      <span>{campaigns} campanha{campaigns !== 1 ? 's' : ''}</span>
                    </div>
                    {lastDate ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Último: {format(parseISO(lastDate), "MMM yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/20 italic">Sem relatórios</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
