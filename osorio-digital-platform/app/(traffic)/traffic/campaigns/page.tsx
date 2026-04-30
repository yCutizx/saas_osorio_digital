import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { PlusCircle, Megaphone } from 'lucide-react'
import { AppLayout }    from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'

type Campaign = {
  id:             string
  name:           string
  platform:       string
  status:         string
  objective:      string | null
  budget_monthly: number | null
  start_date:     string | null
  end_date:       string | null
  clients:        { name: string } | null
}

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', other: 'Outro',
}

const PLATFORM_COLOR: Record<string, string> = {
  meta:     'bg-blue-500/15 text-blue-400',
  google:   'bg-red-500/15 text-red-400',
  tiktok:   'bg-pink-500/15 text-pink-400',
  linkedin: 'bg-sky-500/15 text-sky-400',
  other:    'bg-white/10 text-white/50',
}

const STATUS_LABEL: Record<string, string> = {
  active:   'Ativa',
  paused:   'Pausada',
  finished: 'Encerrada',
}

const STATUS_COLOR: Record<string, string> = {
  active:   'bg-green-500/10 text-green-400',
  paused:   'bg-yellow-500/10 text-yellow-400',
  finished: 'bg-white/8 text-white/30',
}

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'traffic_manager'].includes(profile?.role ?? '')) redirect('/traffic/dashboard')

  let query = supabase
    .from('campaigns')
    .select('id, name, platform, status, objective, budget_monthly, start_date, end_date, clients(name)')
    .order('created_at', { ascending: false })

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length > 0) {
      query = query.in('client_id', ids)
    } else {
      return (
        <AppLayout pageTitle="Campanhas">
          <Empty canCreate={false} />
        </AppLayout>
      )
    }
  }

  const { data: campaigns } = await query
  const list = (campaigns ?? []) as unknown as Campaign[]

  const canCreate = ['admin', 'traffic_manager'].includes(profile?.role ?? '')

  return (
    <AppLayout pageTitle="Campanhas">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-sm">
            {list.length} campanha{list.length !== 1 ? 's' : ''} cadastrada{list.length !== 1 ? 's' : ''}
          </p>
          {canCreate && (
            <Link
              href="/traffic/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-black font-semibold rounded-lg hover:bg-brand-yellow/90 transition-colors text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Nova Campanha
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          <Empty canCreate={canCreate} />
        ) : (
          <div className="rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Campanha', 'Cliente', 'Plataforma', 'Objetivo', 'Orçamento/mês', 'Período', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.map((c) => (
                    <tr key={c.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                        {c.clients?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLOR[c.platform] ?? 'bg-white/10 text-white/50'}`}>
                          {PLATFORM_LABEL[c.platform] ?? c.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 max-w-[140px] truncate">
                        {c.objective ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                        {c.budget_monthly
                          ? `R$ ${c.budget_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs">
                        {c.start_date
                          ? format(parseISO(c.start_date), 'dd/MM/yy')
                          : '—'}
                        {c.end_date ? ` → ${format(parseISO(c.end_date), 'dd/MM/yy')}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] ?? 'bg-white/8 text-white/30'}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function Empty({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-brand-yellow/10 rounded-2xl flex items-center justify-center mb-4">
        <Megaphone className="h-7 w-7 text-brand-yellow/60" />
      </div>
      <h3 className="text-white font-semibold mb-1">Nenhuma campanha cadastrada</h3>
      <p className="text-white/40 text-sm mb-6 max-w-sm">
        Crie campanhas para depois vincular relatórios de performance a elas.
      </p>
      {canCreate && (
        <Link
          href="/traffic/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-black font-semibold rounded-lg hover:bg-brand-yellow/90 transition-colors text-sm"
        >
          <PlusCircle className="h-4 w-4" />
          Criar Primeira Campanha
        </Link>
      )}
    </div>
  )
}
