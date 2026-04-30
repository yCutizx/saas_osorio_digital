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
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-40 object-cover"
        />
      )}

      <div className="p-5 space-y-3">
        <div className="space-y-1">
          <h3 className="text-foreground font-semibold text-base leading-snug">{title}</h3>
          {publishedAt && (
            <p className="text-xs text-muted-foreground">{publishedAt}</p>
          )}
        </div>

        <p className={cn(
          'text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap',
          !expanded && isLong && 'line-clamp-4'
        )}>
          {content}
        </p>

        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-brand-yellow hover:text-brand-yellow/80 transition-colors font-medium"
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
                className="inline-flex items-center gap-0.5 text-xs text-brand-yellow/70 bg-brand-yellow/10 px-2 py-0.5 rounded-full"
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
