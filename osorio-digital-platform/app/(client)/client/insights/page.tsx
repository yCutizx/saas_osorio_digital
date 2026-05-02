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

  const { data: insights } = await supabase
    .from('insights')
    .select('id, title, content, cover_url, tags, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })

  return (
    <AppLayout pageTitle="Insights do Nicho">
      <div className="space-y-6">

        <p className="text-sm text-muted-foreground">
          Conteúdos e tendências publicados pela equipe Osorio Digital.
        </p>

        {!insights?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Lightbulb className="h-10 w-10 text-white/20" />
            <p className="text-muted-foreground text-sm">Nenhum insight publicado ainda.</p>
            <p className="text-xs text-muted-foreground/60">
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
                coverUrl={insight.cover_url}
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
