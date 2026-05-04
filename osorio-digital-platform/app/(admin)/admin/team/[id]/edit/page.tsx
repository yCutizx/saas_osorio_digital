import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { EditMemberForm } from './edit-member-form'

export default async function EditTeamMemberPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const [
    { data: member },
    { data: assignments },
    { data: clients },
  ] = await Promise.all([
    adminSupabase
      .from('profiles')
      .select('id, full_name, email, role, active')
      .eq('id', params.id)
      .single(),
    adminSupabase
      .from('client_assignments')
      .select('client_id, role')
      .eq('user_id', params.id)
      .in('role', ['traffic_manager', 'social_media']),
    adminSupabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  if (!member) notFound()

  const assignedClientIds = (assignments ?? []).map((a) => a.client_id)

  return (
    <AppLayout pageTitle="Editar Funcionário">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/admin/team/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o funcionário
        </Link>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <EditMemberForm
              member={{ ...member, assignedClientIds }}
              clients={clients ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
