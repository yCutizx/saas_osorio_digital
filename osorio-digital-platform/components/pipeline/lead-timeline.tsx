'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, ArrowRight, Pencil, FileText, CheckCircle2, XCircle,
  RotateCcw, Paperclip, Tag, MinusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { translateFieldList, type LeadTimelineEvent, type LeadTimelineEventType } from '@/types'

interface LeadTimelineProps {
  events: LeadTimelineEvent[]
  tagsById?: Record<string, { name: string; color: string }>
}

const ICONS: Record<LeadTimelineEventType, React.ReactNode> = {
  created:          <Plus className="h-3.5 w-3.5" />,
  stage_changed:    <ArrowRight className="h-3.5 w-3.5" />,
  field_updated:    <Pencil className="h-3.5 w-3.5" />,
  note_added:       <FileText className="h-3.5 w-3.5" />,
  won:              <CheckCircle2 className="h-3.5 w-3.5" />,
  lost:             <XCircle className="h-3.5 w-3.5" />,
  reopened:         <RotateCcw className="h-3.5 w-3.5" />,
  attachment_added: <Paperclip className="h-3.5 w-3.5" />,
  tag_added:        <Tag className="h-3.5 w-3.5" />,
  tag_removed:      <MinusCircle className="h-3.5 w-3.5" />,
}

const COLORS: Record<LeadTimelineEventType, string> = {
  created:          'bg-[#EACE00]/10 text-[#EACE00] border-[#EACE00]/20',
  stage_changed:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  field_updated:    'bg-white/5 text-[#888] border-white/10',
  note_added:       'bg-white/5 text-[#888] border-white/10',
  won:              'bg-green-500/10 text-green-400 border-green-500/20',
  lost:             'bg-red-500/10 text-red-400 border-red-500/20',
  reopened:         'bg-purple-500/10 text-purple-400 border-purple-500/20',
  attachment_added: 'bg-white/5 text-[#888] border-white/10',
  tag_added:        'bg-white/5 text-[#888] border-white/10',
  tag_removed:      'bg-white/5 text-[#888] border-white/10',
}

function describe(
  ev: LeadTimelineEvent,
  tagsById?: Record<string, { name: string; color: string }>,
): string {
  const d = ev.event_data ?? {}
  switch (ev.event_type) {
    case 'created':
      return `criou o lead${d.via === 'webhook' ? ' (via webhook)' : ''}`
    case 'stage_changed':
      return `moveu de "${String(d.from ?? '')}" para "${String(d.to ?? '')}"`
    case 'field_updated': {
      const fields = Array.isArray(d.fields) ? (d.fields as string[]) : []
      return `atualizou: ${translateFieldList(fields)}`
    }
    case 'note_added':
      return 'adicionou uma nota'
    case 'won':
      return 'marcou como ganho 🎉'
    case 'lost': {
      const reason = typeof d.reason === 'string' ? d.reason : null
      const other  = typeof d.reason_other === 'string' ? d.reason_other : null
      return `marcou como perdido${reason ? ` — ${reason}` : ''}${other ? `: ${other}` : ''}`
    }
    case 'reopened':
      return `reabriu o lead em "${String(d.to ?? '')}"`
    case 'attachment_added':
      return `anexou: ${String(d.file_name ?? 'arquivo')}`
    case 'tag_added': {
      const tagId = typeof d.tag_id === 'string' ? d.tag_id : null
      const tag = tagId ? tagsById?.[tagId] : null
      return tag ? `adicionou tag: ${tag.name}` : 'adicionou tag'
    }
    case 'tag_removed': {
      const tagId = typeof d.tag_id === 'string' ? d.tag_id : null
      const tag = tagId ? tagsById?.[tagId] : null
      return tag ? `removeu tag: ${tag.name}` : 'removeu tag'
    }
    default:
      return ev.event_type
  }
}

export function LeadTimeline({ events, tagsById }: LeadTimelineProps) {
  if (events.length === 0) {
    return <p className="text-[#555] text-sm text-center py-8">Sem eventos ainda.</p>
  }

  return (
    <div className="space-y-3">
      {events.map((ev) => {
        const author = ev.user?.full_name ?? ev.user?.email ?? (ev.user_id ? 'Usuário' : 'Sistema')
        const when = formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ptBR })
        return (
          <div key={ev.id} className="flex gap-2.5">
            <div className={cn(
              'shrink-0 h-7 w-7 rounded-full border flex items-center justify-center',
              COLORS[ev.event_type] ?? COLORS.field_updated,
            )}>
              {ICONS[ev.event_type] ?? <FileText className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 leading-tight">
                <span className="font-medium text-white">{author}</span>{' '}
                <span className="text-[#888]">{describe(ev, tagsById)}</span>
              </p>
              <p className="text-[10px] text-[#555] mt-0.5">{when}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
