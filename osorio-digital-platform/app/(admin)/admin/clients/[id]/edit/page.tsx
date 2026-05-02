import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { EditClientForm } from './edit-client-form'

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
  ] = await Promise.all([
    adminSupabase
      .from('clients')
      .select('id, name, industry, contact_email, contact_phone, plan, active, contract_status, monthly_value, renewal_date, notes')
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
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o cliente
        </Link>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <EditClientForm
              client={clientData}
              trafficManagers={trafficManagers ?? []}
              socialMediaTeam={socialMediaTeam ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
