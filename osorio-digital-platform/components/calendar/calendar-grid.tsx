'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isToday, addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type CalendarPost = {
  id:           string
  title:        string
  platform:     string
  status:       'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published'
  scheduled_at: string
}

export type PostsByDate = Record<string, CalendarPost[]>

interface Props {
  currentMonth: string
  postsByDate:  PostsByDate
  baseHref:     string
  canCreate?:   boolean
}

// ── Configurações de status ───────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { chip: string; dot: string; label: string }> = {
  draft:            { chip: 'bg-white/8 text-white/40',                                       dot: 'bg-white/25',    label: 'Planejado'         },
  pending_approval: { chip: 'bg-orange-500/20 text-orange-400 border border-orange-500/20',   dot: 'bg-orange-400',  label: 'Aguard. aprovação' },
  approved:         { chip: 'bg-green-500/20 text-green-400 border border-green-500/20',       dot: 'bg-green-400',   label: 'Aprovado'          },
  rejected:         { chip: 'bg-red-500/20 text-red-400 border border-red-500/20',             dot: 'bg-red-400',     label: 'Reprovado'         },
  published:        { chip: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',          dot: 'bg-blue-400',    label: 'Publicado'         },
}

const PLATFORM_SHORT: Record<string, string> = {
  instagram: 'IG', facebook: 'FB', tiktok: 'TT', linkedin: 'LI', twitter: 'TW',
}

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

// ── Modal de detalhe ──────────────────────────────────────────────────────────

function PostModal({
  post, baseHref, onClose,
}: {
  post: CalendarPost; baseHref: string; onClose: () => void
}) {
  const cfg  = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft
  const time = format(new Date(post.scheduled_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-[#333] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Título */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-white font-semibold text-base leading-snug">{post.title}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors mt-0.5 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Detalhes */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-white/40 w-20 shrink-0">Plataforma</span>
            <span className="text-white/80 capitalize">{PLATFORM_SHORT[post.platform] ?? post.platform}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/40 w-20 shrink-0">Agendado</span>
            <span className="text-white/80">{time}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/40 w-20 shrink-0">Status</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.chip)}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`${baseHref}/posts/${post.id}`}
          className="block w-full py-2.5 text-center rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors"
        >
          Ver post completo →
        </Link>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CalendarGrid({ currentMonth, postsByDate, baseHref, canCreate = false }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const [view,      setView]      = useState<'month' | 'week'>('month')
  const [fPlat,     setFPlat]     = useState('')
  const [fStatus,   setFStatus]   = useState('')
  const [openPost,  setOpenPost]  = useState<CalendarPost | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))

  const monthDate  = new Date(`${currentMonth}-01T12:00:00`)
  const monthDays  = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) })
  const weekDays   = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const rawStartDay = getDay(startOfMonth(monthDate))
  const startOffset = rawStartDay === 0 ? 6 : rawStartDay - 1
  const emptyBefore = Array<null>(startOffset).fill(null)

  function applyFilters(posts: CalendarPost[]): CalendarPost[] {
    return posts.filter(p =>
      (!fPlat   || p.platform === fPlat) &&
      (!fStatus || p.status   === fStatus)
    )
  }

  function navigateMonth(delta: number) {
    const next = new Date(monthDate)
    next.setMonth(next.getMonth() + delta)
    const nxt = new URLSearchParams(params.toString())
    nxt.set('month', format(next, 'yyyy-MM'))
    router.push(`${baseHref}/dashboard?${nxt}`)
  }

  const periodLabel = view === 'month'
    ? format(monthDate, 'MMMM yyyy', { locale: ptBR })
    : `${format(weekStart, "d MMM", { locale: ptBR })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: ptBR })}`

  // Render de uma célula de dia
  function renderDay(day: Date, tall: boolean) {
    const dateKey = format(day, 'yyyy-MM-dd')
    const posts   = applyFilters(postsByDate[dateKey] ?? [])
    const tod     = isToday(day)
    const maxShow = tall ? 999 : 3

    return (
      <div
        key={dateKey}
        className={cn(
          'rounded-xl border transition-colors group',
          tall ? 'min-h-[200px] p-2' : 'min-h-[100px] lg:min-h-[115px] p-1.5',
          tod
            ? 'border-[#EACE00]/50 bg-[#EACE00]/5'
            : 'border-[#1e1e1e] bg-[#0d0d0d] hover:border-[#2a2a2a]'
        )}
      >
        {/* Número do dia + botão criar */}
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            'text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0',
            tod ? 'bg-[#EACE00] text-black' : 'text-white/30'
          )}>
            {format(day, 'd')}
          </span>
          {canCreate && (
            <Link
              href={`${baseHref}/posts/new?date=${dateKey}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
              title="Criar post neste dia"
              onClick={e => e.stopPropagation()}
            >
              <Plus className="h-3 w-3 text-white/40 hover:text-[#EACE00]" />
            </Link>
          )}
        </div>

        {/* Chips de posts */}
        <div className={cn('space-y-0.5', tall && 'space-y-1')}>
          {posts.slice(0, maxShow).map((post) => {
            const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft
            return (
              <button
                key={post.id}
                onClick={() => setOpenPost(post)}
                className={cn(
                  'w-full flex items-center gap-1 px-1 rounded text-left hover:opacity-75 transition-opacity',
                  tall ? 'py-1 text-[11px]' : 'py-0.5 text-[10px]',
                  cfg.chip
                )}
                title={post.title}
              >
                <span className="font-bold shrink-0 opacity-60">
                  {PLATFORM_SHORT[post.platform] ?? '??'}
                </span>
                <span className="truncate">{post.title}</span>
              </button>
            )
          })}
          {posts.length > maxShow && (
            <p className="text-[10px] text-white/25 pl-1">+{posts.length - maxShow} mais</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Barra superior: filtros + navegação ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        {/* Filtros de plataforma e status */}
        <div className="flex flex-wrap gap-2">
          <select
            value={fPlat}
            onChange={e => setFPlat(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#EACE00] transition-colors"
          >
            <option value="">Todas as plataformas</option>
            {['instagram', 'facebook', 'tiktok', 'linkedin'].map(p => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </select>

          <select
            value={fStatus}
            onChange={e => setFStatus(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#EACE00] transition-colors"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Toggle mês/semana + navegação */}
        <div className="flex items-center gap-3">
          <div className="flex bg-black/40 rounded-lg p-0.5">
            {(['month', 'week'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  view === v ? 'bg-[#EACE00] text-black' : 'text-white/40 hover:text-white'
                )}
              >
                {v === 'month' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => view === 'month' ? navigateMonth(-1) : setWeekStart(d => addDays(d, -7))}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-white font-bold text-sm capitalize min-w-[190px] text-center">
              {periodLabel}
            </span>
            <button
              onClick={() => view === 'month' ? navigateMonth(1) : setWeekStart(d => addDays(d, 7))}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Cabeçalho dos dias da semana ───────────────────────────── */}
      <div className="grid grid-cols-7 gap-1">
        {(view === 'week'
          ? weekDays.map(d => format(d, 'EEE', { locale: ptBR }))
          : DAY_NAMES
        ).map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-white/25 uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      {/* ── Grid de dias ──────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1">
        {view === 'month' && emptyBefore.map((_, i) => (
          <div key={`e${i}`} className="min-h-[100px] lg:min-h-[115px]" />
        ))}
        {(view === 'month' ? monthDays : weekDays).map(day => renderDay(day, view === 'week'))}
      </div>

      {/* ── Legenda ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-[#1e1e1e]">
        {Object.entries(STATUS_CONFIG).map(([, c]) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', c.dot)} />
            <span className="text-xs text-white/30">{c.label}</span>
          </div>
        ))}
      </div>

      {/* ── Modal de detalhe ──────────────────────────────────────── */}
      {openPost && (
        <PostModal post={openPost} baseHref={baseHref} onClose={() => setOpenPost(null)} />
      )}
    </div>
  )
}
