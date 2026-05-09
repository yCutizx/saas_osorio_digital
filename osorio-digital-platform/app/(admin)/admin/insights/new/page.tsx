import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { NewInsightForm } from './new-insight-form'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function NewInsightPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const { data: clients } = await admin
    .from('clients').select('id, name').eq('active', true).order('name')

  return (
    <AppLayout pageTitle="Novo Insight">
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
            <h1 className="text-lg font-bold text-white mb-6">Novo Insight</h1>
            <NewInsightForm clients={clients ?? []} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
