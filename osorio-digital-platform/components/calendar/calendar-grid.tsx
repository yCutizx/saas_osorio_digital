'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarPost = {
  id:           string
  title:        string
  platform:     string
  status:       'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published'
  scheduled_at: string
}

export type PostsByDate = Record<string, CalendarPost[]>

interface Props {
  currentMonth: string    // "2026-04"
  postsByDate:  PostsByDate
  baseHref:     string    // "/social" ou "/client"
}

// Cores por status — usadas no chip e na legenda
export const STATUS_CONFIG: Record<string, { chip: string; dot: string; label: string }> = {
  draft:            { chip: 'bg-white/10 text-white/50',                   dot: 'bg-white/30',   label: 'Rascunho'   },
  pending_approval: { chip: 'bg-brand-yellow/25 text-brand-yellow border border-brand-yellow/30', dot: 'bg-brand-yellow', label: 'Aguardando' },
  approved:         { chip: 'bg-green-500/20 text-green-400',               dot: 'bg-green-400',  label: 'Aprovado'   },
  rejected:         { chip: 'bg-red-500/20 text-red-400',                   dot: 'bg-red-400',    label: 'Reprovado'  },
  published:        { chip: 'bg-blue-500/20 text-blue-400',                 dot: 'bg-blue-400',   label: 'Publicado'  },
}

const PLATFORM_SHORT: Record<string, string> = {
  instagram: 'IG', facebook: 'FB', linkedin: 'LI',
  tiktok: 'TT', twitter: 'TW',
}

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function CalendarGrid({ currentMonth, postsByDate, baseHref }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  // Garante que a data seja parseada sem problemas de timezone
  const monthDate  = new Date(`${currentMonth}-01T12:00:00`)
  const firstDay   = startOfMonth(monthDate)
  const lastDay    = endOfMonth(monthDate)
  const days       = eachDayOfInterval({ start: firstDay, end: lastDay })

  // Segunda-feira como primeiro dia (domingo=0 vira 6, outros diminuem 1)
  const rawStartDay  = getDay(firstDay)
  const startOffset  = rawStartDay === 0 ? 6 : rawStartDay - 1
  const emptyBefore  = Array<null>(startOffset).fill(null)

  function navigate(delta: number) {
    const next = new Date(monthDate)
    next.setMonth(next.getMonth() + delta)
    const newMonth  = format(next, 'yyyy-MM')
    const nextParams = new URLSearchParams(params.toString())
    nextParams.set('month', newMonth)
    router.push(`${baseHref}/dashboard?${nextParams.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <h3 className="text-foreground font-semibold capitalize">
          {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Células vazias antes do dia 1 */}
        {emptyBefore.map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] lg:min-h-[110px]" />
        ))}

        {/* Dias do mês */}
        {days.map((day) => {
          const dateKey  = format(day, 'yyyy-MM-dd')
          const dayPosts = postsByDate[dateKey] ?? []
          const today    = isToday(day)

          return (
            <div
              key={dateKey}
              className={cn(
                'min-h-[90px] lg:min-h-[110px] p-1.5 rounded-lg border transition-colors',
                today
                  ? 'border-brand-yellow/50 bg-brand-yellow/5'
                  : 'border-border bg-card/40 hover:border-white/15'
              )}
            >
              {/* Número do dia */}
              <span className={cn(
                'text-xs font-medium block mb-1 w-5 h-5 flex items-center justify-center rounded-full',
                today
                  ? 'bg-brand-yellow text-brand-black font-bold'
                  : 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </span>

              {/* Posts do dia */}
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => {
                  const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft
                  return (
                    <Link
                      key={post.id}
                      href={`${baseHref}/posts/${post.id}`}
                      className={cn(
                        'flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate transition-opacity hover:opacity-75',
                        cfg.chip
                      )}
                      title={post.title}
                    >
                      <span className="font-bold shrink-0 opacity-70">
                        {PLATFORM_SHORT[post.platform] ?? 'XX'}
                      </span>
                      <span className="truncate">{post.title}</span>
                    </Link>
                  )
                })}
                {dayPosts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{dayPosts.length - 3}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 pt-1 border-t border-border">
        {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
          <div key={cfg.label} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
