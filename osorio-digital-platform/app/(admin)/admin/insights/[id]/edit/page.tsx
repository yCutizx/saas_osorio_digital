import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditInsightForm } from './edit-insight-form'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function EditInsightPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const { data: insight } = await supabase
    .from('insights')
    .select('id, title, content, cover_url, tags, published')
    .eq('id', params.id)
    .single()

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
            <EditInsightForm insight={insight} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
