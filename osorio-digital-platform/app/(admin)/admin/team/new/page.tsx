import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { NewMemberForm } from './new-member-form'

export default async function NewTeamMemberPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const { data: clients } = await adminSupabase
    .from('clients')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <AppLayout pageTitle="Novo Funcionário">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/admin/team"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Equipe
        </Link>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <NewMemberForm clients={clients ?? []} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
