import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export type CampaignType = 'mensagem' | 'trafego' | 'vendas' | 'lead' | 'cadastro' | 'outro'

export interface ResultItem {
  type:  CampaignType
  label: string
  count: number
}

export const RESULT_TO_TYPE: Record<string, CampaignType> = {
  'actions:onsite_conversion.messaging_conversation_started_7d': 'mensagem',
  'actions:onsite_conversion.messaging_conversation_started':    'mensagem',
  'actions:contact':               'mensagem',
  'actions:link_click':            'trafego',
  'actions:view_content':          'trafego',
  'actions:purchase':              'vendas',
  'actions:add_to_cart':           'vendas',
  'actions:initiate_checkout':     'vendas',
  'actions:lead':                  'lead',
  'actions:subscribe':             'lead',
  'actions:complete_registration': 'cadastro',
}

export const RESULT_TYPE_LABELS: Record<string, string> = {
  'actions:onsite_conversion.messaging_conversation_started_7d': 'conversas no WhatsApp',
  'actions:onsite_conversion.messaging_conversation_started':    'conversas iniciadas',
  'actions:link_click':             'cliques no link',
  'actions:lead':                   'leads gerados',
  'actions:purchase':               'compras realizadas',
  'actions:complete_registration':  'cadastros completos',
  'actions:view_content':           'visualizações de conteúdo',
  'actions:add_to_cart':            'adições ao carrinho',
  'actions:initiate_checkout':      'checkouts iniciados',
  'actions:contact':                'contatos gerados',
  'actions:subscribe':              'inscrições realizadas',
}

export interface HeroStats {
  spend:       number
  conversions: number
  clicks:      number
  impressions: number
  reach:       number
  cpa:         number
  ctr:         number
  cpc:         number
  roas:        number
}

interface Props {
  from:          string
  to:            string
  stats:         HeroStats
  campaignCount: number
  results:       ResultItem[]
}

function fmtN(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtLarge(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return fmtN(n)
}

function fmtPct(n: number) {
  return n > 0 ? `${n.toFixed(2).replace('.', ',')}%` : '—'
}

export function TrafficHeroCard({ from, to, stats, campaignCount, results }: Props) {
  const fromDate = parseISO(from)
  const toDate   = parseISO(to)
  const days     = differenceInDays(toDate, fromDate) + 1
  const cpm      = stats.impressions > 0 ? (stats.spend / stats.impressions) * 1000 : 0
  const freq     = stats.reach > 0 ? stats.impressions / stats.reach : 0

  const hasVendas = results.some((r) => r.type === 'vendas')
  const isMulti   = results.length > 1

  const periodLabel = from === to
    ? format(fromDate, "d 'de' MMM. yyyy", { locale: ptBR })
    : `${format(fromDate, "d 'de' MMM.", { locale: ptBR })} — ${format(toDate, "d 'de' MMM. yyyy", { locale: ptBR })} · ${days} dia${days !== 1 ? 's' : ''}`

  // Primary result for subtitle (highest count)
  const primaryResult = results[0]
  const totalConversions = results.reduce((s, r) => s + r.count, 0)

  return (
    <div className="rounded-2xl overflow-hidden border border-[#2a2500] bg-gradient-to-br from-[#181400] via-[#0d0d00] to-[#0a0a0a]">
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%]">

        {/* ── LEFT — informação principal ───────────────────── */}
        <div className="p-6 lg:p-8 flex flex-col gap-5">

          {/* Badge período */}
          <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white/40">
            <CalendarDays className="h-3 w-3 text-[#EACE00]/50 shrink-0" />
            {periodLabel}
          </div>

          {/* Título principal */}
          <div>
            <div className="flex items-end gap-3 leading-none flex-wrap">
              <span className="text-5xl lg:text-6xl font-black text-white tabular-nums">
                {fmtN(totalConversions)}
              </span>
              <div className="flex flex-col gap-1.5 pb-1.5">
                <span className="text-white/40 text-base leading-tight">
                  {primaryResult
                    ? primaryResult.label
                    : `resultado${totalConversions !== 1 ? 's' : ''}`}
                  <span className="text-white/25 text-sm ml-1.5">gerado{totalConversions !== 1 ? 's' : ''} no período</span>
                </span>
                {hasVendas && stats.roas > 0 && (
                  <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-400 text-xs font-semibold">
                    ROAS {stats.roas.toFixed(2).replace('.', ',')}x
                  </span>
                )}
              </div>
            </div>

            {/* Multi-type breakdown */}
            {isMulti && (
              <div className="flex flex-wrap gap-2 mt-3">
                {results.map((r) => (
                  <span
                    key={r.type}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs"
                  >
                    <span className="font-semibold text-white/75">{fmtN(r.count)}</span>
                    {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Subtítulo descritivo */}
          <p className="text-sm text-white/35 leading-relaxed max-w-md">
            Com{' '}
            <span className="text-white/65 font-semibold">{formatCurrency(stats.spend)}</span>
            {' '}investidos,{stats.reach > 0 && (
              <> alcançamos <span className="text-white/65 font-semibold">{fmtLarge(stats.reach)} pessoas</span> e</>
            )}{' '}geramos{' '}
            <span className="text-white/65 font-semibold">{fmtN(totalConversions)} {primaryResult?.label ?? 'resultados'}</span>
            {hasVendas && stats.roas > 0 ? (
              <> com ROAS de <span className="text-white/65 font-semibold">{stats.roas.toFixed(2).replace('.', ',')}x</span>.</>
            ) : (
              <> a um custo médio de <span className="text-white/65 font-semibold">{stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'}</span> cada.</>
            )}
          </p>

          {/* 3 métricas em linha */}
          <div className="flex items-center gap-0 pt-3 border-t border-white/[0.06]">
            <div className="flex-1 pr-5">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Resultados</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmtN(totalConversions)}</p>
            </div>
            <div className="w-px h-10 bg-white/[0.07]" />
            <div className="flex-1 px-5">
              {hasVendas && stats.roas > 0 ? (
                <>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">ROAS</p>
                  <p className="text-2xl font-black text-white tabular-nums">
                    {stats.roas.toFixed(2).replace('.', ',')}x
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Custo / Resultado</p>
                  <p className="text-2xl font-black text-white tabular-nums">
                    {stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'}
                  </p>
                </>
              )}
            </div>
            <div className="w-px h-10 bg-white/[0.07]" />
            <div className="flex-1 pl-5">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">CTR</p>
              <p className="text-2xl font-black text-white tabular-nums">{fmtPct(stats.ctr)}</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT — grid 2×2 ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-px bg-[#2a2500] border-t lg:border-t-0 lg:border-l border-[#2a2500]">

          {/* Amarelo: INVESTIMENTO */}
          <div className="bg-[#1a1500] p-5 flex flex-col gap-1.5">
            <p className="text-[10px] text-[#EACE00]/45 uppercase tracking-widest font-medium">Investimento</p>
            <p className="text-xl font-black text-[#EACE00] tabular-nums leading-tight">
              {formatCurrency(stats.spend)}
            </p>
            <p className="text-[11px] text-[#EACE00]/30 mt-auto">
              {campaignCount} campanha{campaignCount !== 1 ? 's' : ''} com gasto
            </p>
          </div>

          {/* Amarelo: ALCANCE */}
          <div className="bg-[#1a1500] p-5 flex flex-col gap-1.5">
            <p className="text-[10px] text-[#EACE00]/45 uppercase tracking-widest font-medium">Alcance</p>
            <p className="text-xl font-black text-[#EACE00] tabular-nums leading-tight">
              {stats.reach > 0 ? fmtLarge(stats.reach) : '—'}
            </p>
            <p className="text-[11px] text-[#EACE00]/30 mt-auto">
              {freq > 0
                ? `Frequência: ${freq.toFixed(1).replace('.', ',')}x`
                : 'Frequência: —'}
            </p>
          </div>

          {/* Escuro: IMPRESSÕES */}
          <div className="bg-[#0d0d0d] p-5 flex flex-col gap-1.5">
            <p className="text-[10px] text-white/25 uppercase tracking-widest font-medium">Impressões</p>
            <p className="text-xl font-bold text-white tabular-nums leading-tight">
              {fmtLarge(stats.impressions)}
            </p>
            <p className="text-[11px] text-white/25 mt-auto">
              CPM: {cpm > 0 ? formatCurrency(cpm) : '—'}
            </p>
          </div>

          {/* Escuro: CPC MÉDIO */}
          <div className="bg-[#0d0d0d] p-5 flex flex-col gap-1.5">
            <p className="text-[10px] text-white/25 uppercase tracking-widest font-medium">CPC Médio</p>
            <p className="text-xl font-bold text-white tabular-nums leading-tight">
              {stats.cpc > 0 ? formatCurrency(stats.cpc) : '—'}
            </p>
            <p className="text-[11px] text-white/25 mt-auto">
              {fmtN(stats.clicks)} cliques no link
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
