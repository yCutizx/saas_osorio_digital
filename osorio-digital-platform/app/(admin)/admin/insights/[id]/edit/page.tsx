import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { EditInsightForm } from './edit-insight-form'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function EditInsightPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const [{ data: insight }, { data: clients }] = await Promise.all([
    supabase
      .from('insights')
      .select('id, title, content, type, client_id, cover_url, file_url, tags, published')
      .eq('id', params.id)
      .single(),
    admin
      .from('clients').select('id, name').eq('active', true).order('name'),
  ])

  if (!insight) notFound()

  return (
    <AppLayout pageTitle="Editar Insight">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/admin/insights"
          className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Insights
        </Link>

        <Card className="bg-[#111] border-[#222]">
          <CardContent className="p-6">
            <h1 className="text-lg font-bold text-white mb-6">Editar Insight</h1>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <EditInsightForm insight={insight as any} clients={clients ?? []} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
