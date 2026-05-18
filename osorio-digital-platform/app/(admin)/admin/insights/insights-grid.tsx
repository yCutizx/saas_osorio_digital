'use client'

import { useState } from 'react'
import { Hash, FileText, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InsightDrawer } from '@/components/insights/insight-drawer'
import { togglePublishById, deleteInsightById } from './actions'
import type { Insight, InsightType } from '@/types'
import { INSIGHT_TYPE_LABELS } from '@/types'

type Row = Insight & { clients?: { name: string } | null }

interface Props {
  insights: Row[]
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

export function InsightsGrid({ insights }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? insights.find((i) => i.id === selectedId) ?? null : null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {insights.map((insight) => {
          const typeCls = insight.type ? TYPE_COLOR[insight.type] : null
          const typeLabel = insight.type ? INSIGHT_TYPE_LABELS[insight.type as InsightType] ?? insight.type : null
          const clientName = insight.clients?.name ?? null

          return (
            <button
              key={insight.id}
              type="button"
              onClick={() => setSelectedId(insight.id)}
              className="flex flex-col bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden hover:border-[#EACE00]/40 transition-colors group text-left"
            >
              {insight.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={insight.cover_url} alt={insight.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-24 bg-[#111] flex items-center justify-center">
                  <Lightbulb className="h-8 w-8 text-[#EACE00]/20" />
                </div>
              )}

              <div className="flex-1 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {typeCls && typeLabel && (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border', typeCls)}>
                      {typeLabel}
                    </span>
                  )}
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-medium border',
                    insight.published
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-white/8 text-[#888] border-white/10',
                  )}>
                    {insight.published ? 'Publicado' : 'Rascunho'}
                  </span>
                  {insight.file_url && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/10 inline-flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" />PDF
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-[#EACE00] transition-colors">
                  {insight.title}
                </h3>

                <div className="flex items-center justify-between text-[10px] text-white/30">
                  <span>{clientName ?? 'Geral'}</span>
                  <span>
                    {new Date(insight.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>

                {insight.tags && insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {insight.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] text-[#EACE00]/60 bg-[#EACE00]/8 border border-[#EACE00]/15 px-1.5 py-0.5 rounded-full">
                        <Hash className="h-2 w-2" />{tag}
                      </span>
                    ))}
                    {insight.tags.length > 3 && (
                      <span className="text-[10px] text-white/30">+{insight.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <InsightDrawer
          insight={{
            ...selected,
            client: selected.clients ? { id: selected.client_id ?? '', name: selected.clients.name } : null,
          }}
          canEdit
          editHref={`/admin/insights/${selected.id}/edit`}
          onTogglePublish={() => togglePublishById(selected.id, !selected.published)}
          onDelete={() => deleteInsightById(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
