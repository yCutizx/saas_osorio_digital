import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditResearchForm } from './edit-research-form'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function EditResearchPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const [{ data: research }, { data: clients }] = await Promise.all([
    supabase
      .from('market_research')
      .select('id, title, description, file_url, tags, client_id')
      .eq('id', params.id)
      .single(),
    supabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  if (!research) notFound()

  return (
    <AppLayout pageTitle="Editar Pesquisa">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/admin/research"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pesquisas
        </Link>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <EditResearchForm research={research} clients={clients ?? []} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
