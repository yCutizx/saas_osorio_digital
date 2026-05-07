import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileSearch, ExternalLink, Hash } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireMinPlan } from '@/lib/client-plan'

export default async function ClientResearchPage() {
  await requireMinPlan('pro')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  if (!assignment) redirect('/client/home')

  const { data: research } = await supabase
    .from('market_research')
    .select('id, title, description, file_url, tags, created_at, client_id')
    .or(`client_id.is.null,client_id.eq.${assignment.client_id}`)
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Pesquisas de Mercado">
      <div className="space-y-6">

        <p className="text-sm text-[#888]">
          Pesquisas e análises de mercado selecionadas pela equipe Osorio Digital.
        </p>

        {!research?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FileSearch className="h-7 w-7 text-[#888]" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Nenhuma pesquisa disponível ainda</p>
              <p className="text-[#888] text-sm">Em breve a equipe adicionará pesquisas e análises do seu segmento.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {research.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-5 rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/25 transition-colors"
              >
                {/* Ícone */}
                <div className="w-10 h-10 rounded-xl bg-[#EACE00]/10 border border-[#EACE00]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <FileSearch className="h-4 w-4 text-[#EACE00]/70" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-[#888] leading-relaxed">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[#888]/60 flex-wrap">
                    <span>
                      {format(parseISO(item.created_at), "d 'de' MMMM yyyy", { locale: ptBR })}
                    </span>
                    {!item.client_id && (
                      <span className="px-1.5 py-0.5 rounded-full bg-white/8 border border-white/10 text-[#888]">
                        Geral
                      </span>
                    )}
                  </div>
                  {item.tags && (item.tags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(item.tags as string[]).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 text-xs text-[#EACE00]/70 bg-[#EACE00]/10 border border-[#EACE00]/15 px-2 py-0.5 rounded-full"
                        >
                          <Hash className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00]/10 text-[#EACE00] border border-[#EACE00]/25 text-sm font-medium hover:bg-[#EACE00]/20 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir PDF
                </a>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
