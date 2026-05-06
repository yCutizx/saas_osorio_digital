import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { ImportForm } from './import-form'

const ALLOWED = ['admin', 'traffic_manager']

export default async function ImportReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/traffic/dashboard')

  let clientsQuery = supabase
    .from('clients').select('id, name').eq('active', true).order('name')

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length === 0) redirect('/traffic/dashboard')
    clientsQuery = clientsQuery.in('id', ids)
  }

  const { data: clients } = await clientsQuery

  return (
    <AppLayout pageTitle="Importar Relatório — Meta Ads">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/traffic/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />Voltar ao Dashboard
          </Link>
        </div>
        <ImportForm clients={clients ?? []} />
      </div>
    </AppLayout>
  )
}
