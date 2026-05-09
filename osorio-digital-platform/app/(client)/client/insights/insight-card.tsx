'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Hash, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  mercado:      { label: 'Análise de Mercado',       cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  tendencia:    { label: 'Tendência',                cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  benchmark:    { label: 'Benchmark',                cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  performance:  { label: 'Relatório de Performance', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  oportunidade: { label: 'Oportunidade',             cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  alerta:       { label: 'Alerta',                   cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  dica:         { label: 'Dica Estratégica',         cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

interface InsightCardProps {
  title:       string
  content:     string
  type:        string | null
  coverUrl:    string | null
  fileUrl:     string | null
  tags:        string[]
  publishedAt: string | null
}

export function InsightCard({ title, content, type, coverUrl, fileUrl, tags, publishedAt }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = content.length > 280
  const typeCfg = type ? TYPE_CONFIG[type] : null

  return (
    <div className="rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/25 transition-colors overflow-hidden">
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-44 object-cover"
        />
      )}

      <div className="p-5 space-y-3">
        {/* Type badge */}
        {typeCfg && (
          <span className={cn('inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border', typeCfg.cls)}>
            {typeCfg.label}
          </span>
        )}

        <div className="space-y-1">
          <h3 className="text-white font-bold text-base leading-snug">{title}</h3>
          {publishedAt && (
            <p className="text-xs text-[#888]">{publishedAt}</p>
          )}
        </div>

        <p className={cn(
          'text-sm text-white/70 leading-relaxed whitespace-pre-wrap',
          !expanded && isLong && 'line-clamp-4'
        )}>
          {content}
        </p>

        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-[#EACE00] hover:text-[#f5d800] transition-colors font-medium"
          >
            {expanded
              ? <><ChevronUp className="h-3.5 w-3.5" />Mostrar menos</>
              : <><ChevronDown className="h-3.5 w-3.5" />Ler mais</>}
          </button>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
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

        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Ver documento
          </a>
        )}
      </div>
    </div>
  )
}
