'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  title:       string
  content:     string
  coverUrl:    string | null
  tags:        string[]
  publishedAt: string | null
}

export function InsightCard({ title, content, coverUrl, tags, publishedAt }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = content.length > 280

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
      </div>
    </div>
  )
}
