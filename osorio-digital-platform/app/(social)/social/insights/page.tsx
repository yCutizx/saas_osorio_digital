import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lightbulb } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SocialInsightsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'social_media'].includes(profile?.role ?? '')) {
    redirect('/social/dashboard')
  }

  const { data: insights } = await supabase
    .from('insights')
    .select('id, title, content, tags, published_at, created_at')
    .eq('published', true)
    .order('published_at', { ascending: false })

  return (
    <AppLayout pageTitle="Insights">
      <div className="space-y-5">

        <p className="text-white/40 text-sm">
          {insights?.length ?? 0} insight{(insights?.length ?? 0) !== 1 ? 's' : ''} publicado{(insights?.length ?? 0) !== 1 ? 's' : ''}
        </p>

        {!insights?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center">
              <Lightbulb className="h-7 w-7 text-[#EACE00]/50" />
            </div>
            <p className="text-white/40 text-sm">Nenhum insight publicado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-5 rounded-2xl bg-[#111] border border-[#222] space-y-2"
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white flex-1">{insight.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-medium shrink-0">
                    Publicado
                  </span>
                </div>
                <p className="text-sm text-white/50 line-clamp-3 leading-relaxed">
                  {insight.content}
                </p>
                <div className="flex items-center gap-3 text-xs text-white/25 pt-1">
                  {insight.published_at && (
                    <span>
                      {format(parseISO(insight.published_at), "d 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                  )}
                  {insight.tags && (insight.tags as string[]).length > 0 && (
                    <span>· {(insight.tags as string[]).join(', ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
