import { Lightbulb } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireMinPlan } from '@/lib/client-plan'
import { ClientInsightsGrid } from './insights-grid'
import type { Insight } from '@/types'

export default async function ClientInsightsPage() {
  await requireMinPlan('pro')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .maybeSingle()

  const clientId = assignment?.client_id ?? null

  let query = supabase
    .from('insights')
    .select('id, title, content, type, client_id, cover_url, file_url, tags, published, published_at, author_id, created_at, updated_at')
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (clientId) {
    query = query.or(`client_id.eq.${clientId},client_id.is.null`)
  } else {
    query = query.is('client_id', null)
  }

  const { data: insights } = await query

  return (
    <AppLayout pageTitle="Insights do Nicho">
      <div className="space-y-6">

        <p className="text-sm text-[#888]">
          Conteúdos e tendências publicados pela equipe Osorio Digital.
        </p>

        {!insights?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Lightbulb className="h-10 w-10 text-white/20" />
            <p className="text-[#888] text-sm">Nenhum insight publicado ainda.</p>
            <p className="text-xs text-[#888]/60">
              Em breve a equipe publicará análises e tendências do seu mercado.
            </p>
          </div>
        ) : (
          <ClientInsightsGrid insights={(insights ?? []) as Insight[]} />
        )}

      </div>
    </AppLayout>
  )
}
