'use client'

import { useState } from 'react'
import { Hash, FileText, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InsightDrawer } from '@/components/insights/insight-drawer'
import type { Insight, InsightType } from '@/types'
import { INSIGHT_TYPE_LABELS } from '@/types'

interface Props {
  insights: Insight[]
}

const TYPE_COLOR: Record<string, string> = {
  mercado:      'bg-purple-500/20 text-purple-400 border-purple-500/30',
  tendencia:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  benchmark:    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  performance:  'bg-green-500/20 text-green-400 border-green-500/30',
  oportunidade: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  alerta:       'bg-red-500/20 text-red-400 border-red-500/30',
  dica:         'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export function ClientInsightsGrid({ insights }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? insights.find((i) => i.id === selectedId) ?? null : null

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((insight) => {
          const typeCls = insight.type ? TYPE_COLOR[insight.type] : null
          const typeLabel = insight.type ? INSIGHT_TYPE_LABELS[insight.type as InsightType] ?? insight.type : null

          return (
            <button
              key={insight.id}
              type="button"
              onClick={() => setSelectedId(insight.id)}
              className="rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/40 transition-colors overflow-hidden text-left group"
            >
              {insight.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={insight.cover_url} alt={insight.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-24 bg-[#0a0a0a] flex items-center justify-center">
                  <Lightbulb className="h-8 w-8 text-[#EACE00]/20" />
                </div>
              )}

              <div className="p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {typeCls && typeLabel && (
                    <span className={cn('inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border', typeCls)}>
                      {typeLabel}
                    </span>
                  )}
                  {insight.file_url && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/10 inline-flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" />PDF
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-white font-bold text-base leading-snug group-hover:text-[#EACE00] transition-colors">
                    {insight.title}
                  </h3>
                  {insight.published_at && (
                    <p className="text-xs text-[#888]">
                      {new Date(insight.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <p className="text-sm text-white/60 leading-relaxed line-clamp-3">
                  {insight.content}
                </p>

                {insight.tags && insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {insight.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 text-xs text-[#EACE00]/70 bg-[#EACE00]/10 border border-[#EACE00]/15 px-2 py-0.5 rounded-full">
                        <Hash className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <InsightDrawer
          insight={selected}
          canEdit={false}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
