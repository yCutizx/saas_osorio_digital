import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { EditClientForm } from './edit-client-form'
import { MetaIntegrationSection } from '@/components/clients/meta-integration-section'
import { InstagramIntegrationSection } from '@/components/clients/instagram-integration-section'
import { FinancialSection } from '@/components/finance/financial-section'
import { ClientMembersSection } from '@/components/clients/client-members-section'
import { CommercialSection } from '@/components/commercial/commercial-section'
import { ClientFilesSection } from '@/components/client-files/client-files-section'
import { ClientNotesSection } from '@/components/client-notes/client-notes-section'

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const [
    { data: clientRow },
    { data: assignments },
    { data: trafficManagers },
    { data: socialMediaTeam },
    { data: igAccount },
  ] = await Promise.all([
    adminSupabase
      .from('clients')
      .select('id, name, industry, contact_email, contact_phone, plan, active, contract_status, monthly_value, renewal_date, notes, meta_ad_account_id, meta_business_id, meta_connected_at, meta_last_sync_at, meta_last_sync_status, meta_last_sync_error')
      .eq('id', params.id)
      .single(),
    supabase
      .from('client_assignments')
      .select('role, user_id')
      .eq('client_id', params.id)
      .in('role', ['traffic_manager', 'social_media']),
    adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'traffic_manager')
      .order('full_name'),
    adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'social_media')
      .order('full_name'),
    adminSupabase
      .from('instagram_accounts')
      .select('ig_user_id, ig_username, account_kind, page_name, last_sync_at, last_sync_status, last_sync_error')
      .eq('client_id', params.id)
      .eq('is_primary', true)
      .maybeSingle(),
  ])

  if (!clientRow) notFound()

  const trafficAssignment = assignments?.find((a) => a.role === 'traffic_manager')
  const socialAssignment  = assignments?.find((a) => a.role === 'social_media')

  const clientData = {
    ...clientRow,
    contract_status:    clientRow.contract_status ?? 'ativo',
    traffic_manager_id: trafficAssignment?.user_id ?? null,
    social_media_id:    socialAssignment?.user_id ?? null,
  }

  return (
    <AppLayout pageTitle="Editar Cliente">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/admin/clients/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o cliente
        </Link>

        <Card className="bg-[#111] border-[#222]">
          <CardContent className="p-6">
            <EditClientForm
              client={clientData}
              trafficManagers={trafficManagers ?? []}
              socialMediaTeam={socialMediaTeam ?? []}
            />
          </CardContent>
        </Card>

        <ClientMembersSection clientId={clientRow.id} />

        <MetaIntegrationSection
          clientId={clientRow.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialAdAccountId={(clientRow as any).meta_ad_account_id ?? null}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lastSyncAt={(clientRow as any).meta_last_sync_at ?? null}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lastSyncStatus={(clientRow as any).meta_last_sync_status ?? null}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lastSyncError={(clientRow as any).meta_last_sync_error ?? null}
        />

        <InstagramIntegrationSection
          clientId={clientRow.id}
          connection={igAccount ?? null}
        />

        <FinancialSection clientId={clientRow.id} />

        <CommercialSection clientId={clientRow.id} />

        <ClientNotesSection clientId={clientRow.id} />

        <ClientFilesSection clientId={clientRow.id} />
      </div>
    </AppLayout>
  )
}
