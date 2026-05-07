import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewResearchForm } from './new-research-form'

export default async function NewResearchPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const ALLOWED = ['admin', 'traffic_manager', 'social_media']
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <AppLayout pageTitle="Nova Pesquisa de Mercado">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/admin/research"
          className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pesquisas
        </Link>

        <Card className="bg-[#111] border-[#222]">
          <CardContent className="p-6">
            <NewResearchForm clients={clients ?? []} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
