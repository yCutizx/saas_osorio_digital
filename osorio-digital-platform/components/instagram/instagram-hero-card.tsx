import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays, Users, Eye, Target, UserCheck, Link2,
  Activity, Heart, MessageCircle, Share2, Bookmark, UserPlus,
} from 'lucide-react'

export interface IGHeroStats {
  followers:          number
  views:              number
  reach:              number
  profile_views:      number
  website_clicks:     number
  total_interactions: number
  likes:              number
  comments:           number
  shares:             number
  saves:              number
  accounts_engaged:   number
}

interface Props {
  from:     string
  to:       string
  username: string | null
  stats:    IGHeroStats
}

function fmtN(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtLarge(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return fmtN(n)
}

interface Card {
  label: string
  value: string
  icon:  React.ElementType
  color: string
  bg:    string
}

export function InstagramHeroCard({ from, to, username, stats }: Props) {
  const fromDate = parseISO(from)
  const toDate   = parseISO(to)
  const days     = differenceInDays(toDate, fromDate) + 1

  const periodLabel = from === to
    ? format(fromDate, "d 'de' MMM. yyyy", { locale: ptBR })
    : `${format(fromDate, "d 'de' MMM.", { locale: ptBR })} — ${format(toDate, "d 'de' MMM. yyyy", { locale: ptBR })} · ${days} dia${days !== 1 ? 's' : ''}`

  const primaryCards: Card[] = [
    { label: 'Seguidores',        value: fmtN(stats.followers),         icon: Users,     color: 'text-[#EACE00]',  bg: 'bg-[#EACE00]/10' },
    { label: 'Impressões',        value: fmtLarge(stats.views),         icon: Eye,       color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Alcance',           value: fmtLarge(stats.reach),         icon: Target,    color: 'text-green-400',  bg: 'bg-green-400/10' },
    { label: 'Visitas no perfil', value: fmtN(stats.profile_views),     icon: UserCheck, color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    { label: 'Cliques no link',   value: fmtN(stats.website_clicks),    icon: Link2,     color: 'text-pink-400',   bg: 'bg-pink-400/10' },
  ]

  const engagementCards: Card[] = [
    { label: 'Total de interações', value: fmtN(stats.total_interactions), icon: Activity,      color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Curtidas',            value: fmtN(stats.likes),              icon: Heart,         color: 'text-red-400',    bg: 'bg-red-400/10' },
    { label: 'Comentários',         value: fmtN(stats.comments),           icon: MessageCircle, color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    { label: 'Compartilhamentos',   value: fmtN(stats.shares),             icon: Share2,        color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
    { label: 'Salvamentos',         value: fmtN(stats.saves),              icon: Bookmark,      color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Contas engajadas',    value: fmtN(stats.accounts_engaged),   icon: UserPlus,      color: 'text-green-400',  bg: 'bg-green-400/10' },
  ]

  return (
    <div className="rounded-2xl overflow-hidden border border-[#2a2500] bg-gradient-to-br from-[#181400] via-[#0d0d00] to-[#0a0a0a] p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white/40">
          <CalendarDays className="h-3 w-3 text-[#EACE00]/50 shrink-0" />
          {periodLabel}
        </div>
        {username && (
          <span className="text-sm text-white/60 font-semibold">@{username}</span>
        )}
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {primaryCards.map((c) => (
          <div key={c.label} className="rounded-xl bg-[#111] border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">{c.label}</span>
              <div className={`p-1.5 rounded-lg ${c.bg}`}>
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Engajamento */}
      <div>
        <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
          Engajamento do período
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {engagementCards.map((c) => (
            <div key={c.label} className="rounded-xl bg-[#0d0d0d] border border-white/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-white/40 uppercase tracking-wider truncate">{c.label}</span>
                <div className={`p-1 rounded-md ${c.bg} shrink-0`}>
                  <c.icon className={`h-3 w-3 ${c.color}`} />
                </div>
              </div>
              <div className="text-lg font-bold text-white tabular-nums">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
