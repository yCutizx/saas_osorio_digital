import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { NewReportForm } from './new-report-form'

async function getClientsWithCampaigns() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'traffic_manager'].includes(profile?.role ?? '')) {
    redirect('/traffic/dashboard')
  }

  // Admin vê todos os clientes; gestor vê apenas os seus
  let clientIds: string[] | null = null

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments')
      .select('client_id')
      .eq('user_id', user.id)
      .eq('role', 'traffic_manager')
    clientIds = (assignments ?? []).map((a) => a.client_id)
  }

  let query = supabase
    .from('clients')
    .select('id, name, campaigns(id, name, platform, status)')
    .eq('active', true)
    .eq('campaigns.status', 'active')
    .order('name')

  if (clientIds !== null) {
    query = query.in('id', clientIds)
  }

  const { data } = await query

  // Filtrar para ter só clientes com campanhas ativas
  return (data ?? []).map((c) => ({
    id:        c.id,
    name:      c.name,
    campaigns: (c.campaigns as { id: string; name: string; platform: string }[]) ?? [],
  }))
}

export default async function NewReportPage() {
  const clients = await getClientsWithCampaigns()

  return (
    <AppLayout pageTitle="Novo Relatório">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/traffic/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o Dashboard
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Registrar Métricas</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Insira os dados de performance de uma campanha para um período específico.
            </p>
          </div>

          {clients.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                Nenhum cliente com campanhas ativas encontrado.
              </p>
              <Link
                href="/admin/clients/new"
                className="text-brand-yellow text-sm hover:text-brand-yellow/80 transition-colors"
              >
                Cadastrar cliente →
              </Link>
            </div>
          ) : (
            <NewReportForm clients={clients} />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
