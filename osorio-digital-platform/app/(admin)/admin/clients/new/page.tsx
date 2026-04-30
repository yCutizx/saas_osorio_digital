import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { NewClientForm } from './new-client-form'

async function getTeamMembers() {
  const supabase = await createClient()

  const [{ data: traffic }, { data: social }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'traffic_manager')
      .order('full_name'),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'social_media')
      .order('full_name'),
  ])

  return {
    trafficManagers: traffic ?? [],
    socialMediaTeam: social  ?? [],
  }
}

export default async function NewClientPage() {
  const { trafficManagers, socialMediaTeam } = await getTeamMembers()

  return (
    <AppLayout pageTitle="Novo Cliente">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Clientes
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dados do Cliente</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Após salvar, um acesso será criado automaticamente com o e-mail informado.
            </p>
          </div>

          {(trafficManagers.length === 0 || socialMediaTeam.length === 0) && (
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-lg px-4 py-3 text-sm">
              <strong>Atenção:</strong> Você ainda não tem{' '}
              {trafficManagers.length === 0 && 'gestores de tráfego'}
              {trafficManagers.length === 0 && socialMediaTeam.length === 0 && ' nem '}
              {socialMediaTeam.length === 0 && 'profissionais de social media'} cadastrados.{' '}
              Cadastre membros da equipe antes de criar clientes para poder atribuí-los.
            </div>
          )}

          <NewClientForm
            trafficManagers={trafficManagers}
            socialMediaTeam={socialMediaTeam}
          />
        </div>
      </div>
    </AppLayout>
  )
}
