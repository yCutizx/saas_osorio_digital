import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AppLayout }       from '@/components/layout/app-layout'
import { createClient }    from '@/lib/supabase/server'
import { redirect }        from 'next/navigation'
import { NewCampaignForm } from './new-campaign-form'

export default async function NewCampaignPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'traffic_manager'].includes(profile?.role ?? '')) redirect('/traffic/dashboard')

  // Clientes acessíveis
  let clientsQuery = supabase
    .from('clients').select('id, name').eq('active', true).order('name')

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length > 0) clientsQuery = clientsQuery.in('id', ids)
  }

  const { data: clients } = await clientsQuery

  return (
    <AppLayout pageTitle="Nova Campanha">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/traffic/campaigns"
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Campanhas
          </Link>
        </div>

        <div className="rounded-2xl bg-[#111] border border-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Nova Campanha</h2>
          <p className="text-white/40 text-sm mb-6">
            Cadastre a campanha para depois lançar relatórios de performance vinculados a ela.
          </p>
          <NewCampaignForm clients={clients ?? []} />
        </div>
      </div>
    </AppLayout>
  )
}
