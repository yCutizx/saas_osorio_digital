import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewInsightForm } from './new-insight-form'

export default async function NewInsightPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  return (
    <AppLayout pageTitle="Novo Insight">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/admin/insights"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Insights
        </Link>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <NewInsightForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
