'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Eye, Heart, MessageCircle, Share2, Bookmark, Activity, Clock,
  Image as ImageIcon, Film, Layers, Video, ExternalLink, Trophy, Loader2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { InstagramMediaWithInsights, InstagramMediaType } from '@/types'
import { fetchPostInsightsHistoryAction } from '@/app/actions/instagram-sync'

interface Props {
  clientId: string
  post:     InstagramMediaWithInsights
  isTop?:   boolean
}

const TYPE_META: Record<InstagramMediaType, { label: string; color: string; icon: React.ElementType }> = {
  IMAGE:          { label: 'Imagem',    color: 'text-sky-400',    icon: ImageIcon },
  CAROUSEL_ALBUM: { label: 'Carrossel', color: 'text-purple-400', icon: Layers    },
  VIDEO:          { label: 'Vídeo',     color: 'text-orange-400', icon: Video     },
  REELS:          { label: 'Reels',     color: 'text-[#EACE00]',  icon: Film      },
}

function fmtN(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return n.toLocaleString('pt-BR')
}

function truncate(s: string | null, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

interface HistoryRow {
  snapshot_date:                  string
  views:                          number
  reach:                          number
  likes:                          number
  comments:                       number
  shares:                         number
  saves:                          number
  total_interactions:             number
  ig_reels_avg_watch_time:        number | null
  ig_reels_video_view_total_time: number | null
}

export function InstagramPostCard({ clientId, post, isTop }: Props) {
  const [open, setOpen]       = useState(false)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [pending, startLoad]  = useTransition()

  const meta    = TYPE_META[post.media_type]
  const Icon    = meta.icon
  const insight = post.latest_insight
  // API v25 não popula thumbnail_url pra CAROUSEL_ALBUM — usa media_url como
  // fallback (primeira imagem do álbum).
  const coverSrc = post.thumbnail_url ?? post.media_url ?? null

  function loadHistory() {
    if (history !== null || pending) return
    startLoad(async () => {
      const r = await fetchPostInsightsHistoryAction({ clientId, mediaId: post.media_id })
      if ('error' in r) {
        setHistory([])
        return
      }
      setHistory(r.history as HistoryRow[])
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) loadHistory()
      }}
    >
      <SheetTrigger
        className="group text-left rounded-2xl overflow-hidden border border-white/5 bg-[#111] hover:border-[#EACE00]/40 transition-all w-full"
      >
          {/* Thumb */}
          <div className="relative aspect-video bg-[#0a0a0a] overflow-hidden">
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt={post.caption?.slice(0, 60) ?? 'Post'}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-1">
                <Icon className="h-8 w-8" />
                <span className="text-[10px] uppercase tracking-widest">Sem capa</span>
              </div>
            )}
            {isTop && (
              <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-[#EACE00] text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                <Trophy className="h-3 w-3" />
                Top post
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className={cn('inline-flex items-center gap-1', meta.color)}>
                <Icon className="h-3 w-3" />
                {meta.label}
              </span>
              <span className="text-white/30">•</span>
              <span className="text-white/50">
                {format(parseISO(post.posted_at), "d 'de' MMM. yyyy", { locale: ptBR })}
              </span>
            </div>

            <p className="text-sm text-white/70 leading-snug min-h-[40px]">
              {truncate(post.caption, 80) || <span className="text-white/30 italic">Sem legenda</span>}
            </p>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
              <Metric icon={Eye}           value={insight?.views    ?? 0} />
              <Metric icon={Heart}         value={insight?.likes    ?? 0} />
              <Metric icon={MessageCircle} value={insight?.comments ?? 0} />
              <Metric icon={Share2}        value={insight?.shares   ?? 0} />
            </div>
          </div>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0A0A0A] border-l border-[#222] overflow-y-auto p-0">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Detalhes do post</SheetTitle>
        </SheetHeader>

        {/* Imagem grande */}
        <div className="relative aspect-square bg-[#0a0a0a] overflow-hidden">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt={post.caption?.slice(0, 60) ?? 'Post'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-1">
              <Icon className="h-12 w-12" />
              <span className="text-xs uppercase tracking-widest">Sem capa</span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn('inline-flex items-center gap-1', meta.color)}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/50">
              Postado em {format(parseISO(post.posted_at), "d 'de' MMM. 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {post.caption && (
            <div className="rounded-xl bg-[#111] border border-white/5 p-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
              {post.caption}
            </div>
          )}

          {/* Métricas */}
          <div>
            <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Métricas</h4>
            <div className="grid grid-cols-3 gap-2">
              <BigMetric icon={Eye}           label="Views"     value={insight?.views              ?? 0} />
              <BigMetric icon={Heart}         label="Curtidas"  value={insight?.likes              ?? 0} />
              <BigMetric icon={MessageCircle} label="Coments."  value={insight?.comments           ?? 0} />
              <BigMetric icon={Share2}        label="Shares"    value={insight?.shares             ?? 0} />
              <BigMetric icon={Bookmark}      label="Salvos"    value={insight?.saves              ?? 0} />
              <BigMetric icon={Activity}      label="Interações" value={insight?.total_interactions ?? 0} />
            </div>
          </div>

          {/* Reels-only */}
          {post.media_type === 'REELS' && insight?.ig_reels_avg_watch_time !== null && insight?.ig_reels_avg_watch_time !== undefined && (
            <div>
              <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                Tempo médio de visualização
              </h4>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-white/5">
                <Clock className="h-4 w-4 text-[#EACE00]" />
                <span className="text-lg font-bold text-white tabular-nums">
                  {Math.round((insight.ig_reels_avg_watch_time ?? 0) / 1000)}s
                </span>
              </div>
            </div>
          )}

          {/* Histórico de views */}
          <div>
            <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
              Evolução de views
            </h4>
            {pending ? (
              <div className="h-40 flex items-center justify-center text-white/30 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
              </div>
            ) : history && history.length >= 2 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history.map((r) => ({
                  date:  format(parseISO(r.snapshot_date), 'dd/MM', { locale: ptBR }),
                  views: r.views,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="views" stroke="#EACE00" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-white/40">
                Sem histórico ainda — aparece após o 2º snapshot diário deste post.
              </p>
            )}
          </div>

          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00] text-black font-bold text-sm hover:bg-[#f5d800] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Ver no Instagram
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Metric({ icon: Icon, value }: { icon: React.ElementType; value: number }) {
  return (
    <div className="flex items-center gap-1 text-white/60">
      <Icon className="h-3 w-3 text-white/30 shrink-0" />
      <span className="tabular-nums">{fmtN(value)}</span>
    </div>
  )
}

function BigMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#111] border border-white/5 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-white/30" />
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-bold text-white tabular-nums">{fmtN(value)}</div>
    </div>
  )
}

// silence unused import warning for Image — kept available pra trocar <img> caso queira otimizar
void Image
