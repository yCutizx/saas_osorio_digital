'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  format, subDays, startOfMonth, endOfMonth,
  subMonths, parseISO, startOfWeek, endOfWeek, subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronDown } from 'lucide-react'

type Client = { id: string; name: string }

interface Props {
  clients:         Client[]
  currentFrom:     string
  currentTo:       string
  currentClientId: string | null
  basePath?:       string
}

const PRESETS = [
  { label: 'Hoje',            from: () => format(new Date(), 'yyyy-MM-dd'),                                     to: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Ontem',           from: () => format(subDays(new Date(), 1), 'yyyy-MM-dd'),                         to: () => format(subDays(new Date(), 1), 'yyyy-MM-dd') },
  { label: 'Últimos 7 dias',  from: () => format(subDays(new Date(), 6), 'yyyy-MM-dd'),                         to: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Últimos 14 dias', from: () => format(subDays(new Date(), 13), 'yyyy-MM-dd'),                        to: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Últimos 28 dias', from: () => format(subDays(new Date(), 27), 'yyyy-MM-dd'),                        to: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Últimos 30 dias', from: () => format(subDays(new Date(), 29), 'yyyy-MM-dd'),                        to: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Esta semana',     from: () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),                    to: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Semana passada',  from: () => format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd'),     to: () => format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd') },
  { label: 'Este mês',        from: () => format(startOfMonth(new Date()), 'yyyy-MM-dd'),                       to: () => format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  { label: 'Mês passado',     from: () => format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),          to: () => format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') },
]

function formatDateRange(from: string, to: string) {
  try {
    const f = parseISO(from), t = parseISO(to)
    if (from === to) return format(f, "d MMM yyyy", { locale: ptBR })
    return `${format(f, "d MMM", { locale: ptBR })} – ${format(t, "d MMM yyyy", { locale: ptBR })}`
  } catch { return `${from} – ${to}` }
}

function formatButtonLabel(from: string, to: string): string {
  const match = PRESETS.find((p) => p.from() === from && p.to() === to)
  const range = formatDateRange(from, to)
  if (match) return `${match.label}: ${range}`
  return `Personalizado: ${range}`
}

export function TrafficFilters({ clients, currentFrom, currentTo, currentClientId, basePath = '/traffic/dashboard' }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const [open,   setOpen]   = useState(false)
  const [custom, setCustom] = useState(false)
  const [cfrom,  setCfrom]  = useState(currentFrom)
  const [cto,    setCto]    = useState(currentTo)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCustom(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function push(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    Object.entries(updates).forEach(([k, v]) => v === null ? next.delete(k) : next.set(k, v))
    router.push(`${basePath}?${next}`)
  }

  function applyPreset(p: typeof PRESETS[0]) {
    push({ from: p.from(), to: p.to() })
    setOpen(false)
    setCustom(false)
  }

  function applyCustom() {
    if (cfrom && cto && cfrom <= cto) {
      push({ from: cfrom, to: cto })
      setOpen(false)
      setCustom(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

      {/* Seletor de período */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[#111] border border-white/10 text-white text-sm hover:border-[#EACE00]/40 transition-colors"
        >
          <CalendarDays className="h-3.5 w-3.5 text-[#EACE00] shrink-0" />
          <span className="font-medium">{formatButtonLabel(currentFrom, currentTo)}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1 min-w-[210px]">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="w-full text-left px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-[#2a2a2a] my-1" />
            <button
              onClick={() => setCustom(v => !v)}
              className="w-full text-left px-4 py-2 text-sm text-[#EACE00]/70 hover:text-[#EACE00] hover:bg-white/5 transition-colors"
            >
              Personalizado
            </button>
            {custom && (
              <div className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 px-1">Início</p>
                    <input
                      type="date" value={cfrom} onChange={e => setCfrom(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-[#EACE00] [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 px-1">Fim</p>
                    <input
                      type="date" value={cto} onChange={e => setCto(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-[#EACE00] [color-scheme:dark]"
                    />
                  </div>
                </div>
                <button
                  onClick={applyCustom}
                  className="w-full py-1.5 rounded-lg bg-[#EACE00] text-black text-xs font-semibold hover:bg-[#f5d800] transition-colors"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seletor de cliente */}
      {clients.length > 1 && (
        <select
          value={currentClientId ?? ''}
          onChange={e => push({ client: e.target.value || null })}
          className="h-9 px-3 rounded-lg bg-[#111] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EACE00]/40 transition-colors"
        >
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  )
}
