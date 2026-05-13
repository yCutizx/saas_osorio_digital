import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lightbulb } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireMinPlan } from '@/lib/client-plan'
import { InsightCard } from './insight-card'

export default async function ClientInsightsPage() {
  await requireMinPlan('pro')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get the client this user is assigned to
  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .maybeSingle()

  const clientId = assignment?.client_id ?? null

  // Show insights specific to this client OR general (no client)
  let query = supabase
    .from('insights')
    .select('id, title, content, type, cover_url, file_url, tags, published_at')
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                title={insight.title}
                content={insight.content}
                type={(insight.type as string | null) ?? null}
                coverUrl={insight.cover_url}
                fileUrl={(insight as { file_url?: string | null }).file_url ?? null}
                tags={(insight.tags as string[] | null) ?? []}
                publishedAt={insight.published_at
                  ? format(parseISO(insight.published_at), "d 'de' MMMM yyyy", { locale: ptBR })
                  : null}
              />
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
