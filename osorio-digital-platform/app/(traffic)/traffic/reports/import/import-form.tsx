'use client'

import { useState, useRef, useTransition } from 'react'
import Papa from 'papaparse'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Trash2 } from 'lucide-react'
import { importMetaReportAction, clearClientDataAction } from './actions'

// ── Mapeamento exato das colunas do Meta Ads Manager ─────────────────────────
const COL = {
  period_start: 'Início dos relatórios',
  period_end:   'Encerramento dos relatórios',
  name:         'Nome da campanha',
  status:       'Veiculação da campanha',
  results:      'Resultados',
  reach:        'Alcance',
  spend:        'Valor usado (BRL)',
  impressions:  'Impressões',
  cpm:          'CPM (custo por 1.000 impressões) (BRL)',
  clicks:       'Cliques no link',
  cpc:          'CPC (custo por clique no link) (BRL)',
  ctr:          'CTR (taxa de cliques no link)',
  cpa:          'Custo por resultados',
  result_type:  'Indicador de resultados',
} as const

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Client = { id: string; name: string }

// Linha diária bruta do CSV (uma por dia por campanha)
type DailyRow = {
  campaign_name: string
  status:        'active' | 'paused'
  date:          string   // período desta linha (dia)
  results:       number
  reach:         number
  spend:         number
  impressions:   number
  clicks:        number
  result_type:   string
}

// Linha diária exportada para a action (para traffic_daily)
export type { DailyRow }

// Linha agrupada por campanha (o que vai pro banco e pro preview)
export type GroupedRow = {
  campaign_name: string
  status:        'active' | 'paused'
  period_start:  string
  period_end:    string
  spend:         number
  impressions:   number
  reach:         number
  clicks:        number
  results:       number
  cpm:           number
  cpc:           number
  ctr:           number
  cpa:           number
  result_type:   string
}

// ── Parsers numéricos ─────────────────────────────────────────────────────────
// Converte formato BR: "1.741,856" → 1741.856, "46.303,00" → 46303
function parseBRL(v?: string): number {
  if (!v || v.trim() === '' || v.trim() === '--') return 0
  return parseFloat(v.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0
}

function parseIntBR(v?: string): number {
  return Math.round(parseBRL(v))
}

// Data: aceita "dd/mm/yyyy" (BR) ou "yyyy-mm-dd" (ISO)
function parseDate(v?: string): string {
  if (!v) return ''
  const s = v.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s
}

function mapStatus(v?: string): 'active' | 'paused' {
  const lower = (v ?? '').toLowerCase()
  if (lower === 'active' || lower === 'ativo') return 'active'
  return 'paused'
}

// ── Parse do CSV (retorna linhas diárias brutas) ───────────────────────────────
function parseMeta(csv: string): { daily: DailyRow[]; missingCols: string[] } {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  const headers     = result.meta.fields ?? []
  const missingCols = Object.values(COL).filter((c) => !headers.includes(c))

  const daily = result.data
    .map((row): DailyRow => ({
      campaign_name: row[COL.name]?.trim()           ?? '',
      status:        mapStatus(row[COL.status]),
      date:          parseDate(row[COL.period_start]) || parseDate(row[COL.period_end]),
      results:       parseIntBR(row[COL.results]),
      reach:         parseIntBR(row[COL.reach]),
      spend:         parseBRL(row[COL.spend]),
      impressions:   parseIntBR(row[COL.impressions]),
      clicks:        parseIntBR(row[COL.clicks]),
      result_type:   row[COL.result_type]?.trim()    ?? '',
    }))
    .filter((r) => r.spend > 0 && r.campaign_name.length > 0)

  return { daily, missingCols }
}

// ── Agrupa linhas diárias por campanha ────────────────────────────────────────
function groupByCampaign(daily: DailyRow[]): GroupedRow[] {
  const map = new Map<string, {
    name:        string
    status:      'active' | 'paused'
    dates:       string[]
    spend:       number
    impressions: number
    reach:       number
    clicks:      number
    results:     number
    result_type: string
  }>()

  for (const row of daily) {
    const key = row.campaign_name.toLowerCase()
    const ex  = map.get(key)
    if (ex) {
      ex.spend       += row.spend
      ex.impressions += row.impressions
      ex.reach       += row.reach
      ex.clicks      += row.clicks
      ex.results     += row.results
      if (row.date) ex.dates.push(row.date)
      if (row.status === 'active') ex.status = 'active'
    } else {
      map.set(key, {
        name:        row.campaign_name,
        status:      row.status,
        dates:       row.date ? [row.date] : [],
        spend:       row.spend,
        impressions: row.impressions,
        reach:       row.reach,
        clicks:      row.clicks,
        results:     row.results,
        result_type: row.result_type,
      })
    }
  }

  return Array.from(map.values()).map((v) => {
    const sorted = Array.from(new Set(v.dates)).sort()
    const { spend, impressions, clicks, results } = v
    return {
      campaign_name: v.name,
      status:        v.status,
      period_start:  sorted[0]                  ?? '',
      period_end:    sorted[sorted.length - 1]  ?? '',
      spend,
      impressions,
      reach:   v.reach,
      clicks,
      results,
      cpm:     impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpc:     clicks > 0      ? spend / clicks               : 0,
      ctr:     impressions > 0 ? clicks / impressions          : 0,
      cpa:     results > 0     ? spend / results               : 0,
      result_type: v.result_type,
    }
  })
}

// ── Helpers de formatação ─────────────────────────────────────────────────────
function fmtBRL(n: number) {
  return n === 0 ? '—' : 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n: number) {
  return n === 0 ? '—' : n.toLocaleString('pt-BR')
}

function fmtPct(n: number) {
  return n === 0 ? '—' : (n * 100).toFixed(2).replace('.', ',') + '%'
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ImportForm({ clients }: { clients: Client[] }) {
  const [clientId, setClientId]     = useState(clients[0]?.id ?? '')
  const [rows, setRows]             = useState<GroupedRow[]>([])
  const [dailyRows, setDailyRows]   = useState<DailyRow[]>([])
  const [fileName, setFileName]     = useState('')
  const [missingCols, setMissing]   = useState<string[]>([])
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState<{ saved: number; skipped: number } | null>(null)
  const [isPending, startT]         = useTransition()
  const [isClearing, startClear]    = useTransition()
  const [clearDone, setClearDone]   = useState(false)
  const fileRef                     = useRef<HTMLInputElement>(null)

  function reset() {
    setRows([]); setDailyRows([]); setFileName(''); setMissing([]); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFile(file: File) {
    reset()
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { daily, missingCols: missing } = parseMeta(text)
      setMissing(missing)
      if (daily.length === 0) {
        setError('Nenhuma campanha com gasto encontrada. Verifique se o arquivo é um export válido do Meta Ads Manager.')
        return
      }
      setDailyRows(daily)
      setRows(groupByCampaign(daily))
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleConfirm() {
    if (!clientId || rows.length === 0) return
    setError('')
    startT(async () => {
      const result = await importMetaReportAction(clientId, rows, dailyRows)
      if (result?.message) setError(result.message)
      else setSuccess({ saved: result.saved ?? 0, skipped: result.skipped ?? 0 })
    })
  }

  // Período global do CSV (menor start → maior end entre todas as campanhas)
  const overallStart = rows.length > 0
    ? rows.reduce((m, r) => r.period_start < m ? r.period_start : m, rows[0].period_start)
    : ''
  const overallEnd = rows.length > 0
    ? rows.reduce((m, r) => r.period_end > m ? r.period_end : m, rows[0].period_end)
    : ''

  // ── Tela de sucesso ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-white font-bold text-xl">Importação concluída!</h2>
        <div className="flex flex-col items-center gap-1 text-sm">
          {success.saved > 0 && (
            <p className="text-green-400">
              {success.saved} campanha{success.saved > 1 ? 's' : ''} nova{success.saved > 1 ? 's' : ''} adicionada{success.saved > 1 ? 's' : ''} ao histórico.
            </p>
          )}
          {success.skipped > 0 && (
            <p className="text-white/40">
              {success.skipped} já existia{success.skipped > 1 ? 'm' : ''} neste período e foi{success.skipped > 1 ? 'ram' : ''} ignorada{success.skipped > 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <a
          href="/traffic/dashboard"
          className="mt-2 px-6 py-2.5 bg-[#EACE00] text-black text-sm font-semibold rounded-xl hover:bg-[#f5d800] transition-colors"
        >
          Ver Dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-white">Importar Relatório — Meta Ads</h1>
        <p className="text-white/40 text-sm mt-1">
          Exporte o relatório no Meta Ads Manager (CSV) e faça upload abaixo.
        </p>
      </div>

      {/* Seleção de cliente */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl p-5 space-y-3">
        <label className="text-xs text-white/50 uppercase tracking-wider font-medium">
          Cliente <span className="text-red-400">*</span>
        </label>
        <select
          value={clientId}
          onChange={(e) => { setClientId(e.target.value); reset(); setClearDone(false) }}
          className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#EACE00] transition-colors"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Limpar dados de teste */}
        <div className="pt-1 border-t border-white/5">
          {clearDone ? (
            <p className="text-green-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Dados de tráfego deletados. Pode reimportar.
            </p>
          ) : (
            <button
              onClick={() => {
                if (!confirm('Isso vai deletar TODOS os relatórios, campanhas Meta e dados diários deste cliente. Confirmar?')) return
                setClearDone(false)
                startClear(async () => {
                  const result = await clearClientDataAction(clientId)
                  if (result.error) setError(result.error)
                  else { setClearDone(true); reset() }
                })
              }}
              disabled={isClearing || !clientId}
              className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {isClearing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
              {isClearing ? 'Limpando...' : 'Limpar dados de teste'}
            </button>
          )}
        </div>
      </div>

      {/* Área de upload */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="bg-[#0d0d0d] border-2 border-dashed border-[#333] hover:border-[#EACE00]/50 rounded-2xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {fileName ? (
          <>
            <FileText className="h-8 w-8 text-[#EACE00]" />
            <p className="text-white text-sm font-medium">{fileName}</p>
            <p className="text-white/30 text-xs">Clique para trocar o arquivo</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-white/20 group-hover:text-[#EACE00]/60 transition-colors" />
            <p className="text-white/50 text-sm">
              Arraste o arquivo aqui ou{' '}
              <span className="text-[#EACE00]">clique para selecionar</span>
            </p>
            <p className="text-white/20 text-xs">Formato aceito: .csv exportado do Meta Ads Manager</p>
          </>
        )}
      </div>

      {/* Aviso de colunas ausentes */}
      {missingCols.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
          <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-yellow-300 text-sm font-medium mb-1">
              Colunas não encontradas no arquivo:
            </p>
            <ul className="text-yellow-400/60 text-xs space-y-0.5">
              {missingCols.map((c) => <li key={c}>• {c}</li>)}
            </ul>
            <p className="text-yellow-400/40 text-xs mt-2">
              Verifique se o export foi feito com todas as colunas selecionadas.
            </p>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">
              Preview —{' '}
              <span className="text-[#EACE00]">{rows.length}</span>{' '}
              campanha{rows.length > 1 ? 's' : ''} agrupada{rows.length > 1 ? 's' : ''}
            </h2>
            <button onClick={reset} className="text-white/30 hover:text-white transition-colors p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Badge de período global */}
          <div className="bg-[#EACE00]/10 border border-[#EACE00]/20 rounded-xl px-4 py-3 text-sm text-[#EACE00]/80">
            Período do relatório:{' '}
            <strong className="text-[#EACE00]">{overallStart}</strong>
            {' '}até{' '}
            <strong className="text-[#EACE00]">{overallEnd}</strong>
          </div>

          {/* Tabela de preview agrupada */}
          <div className="rounded-2xl bg-[#0d0d0d] border border-[#222] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#222]">
                    {['Campanha', 'Status', 'Período', 'Gasto total', 'Impressões', 'Alcance', 'Cliques', 'CTR', 'CPM', 'CPC', 'Resultados', 'CPA'].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs text-white/30 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-2.5 text-white font-medium max-w-[200px] truncate" title={r.campaign_name}>
                        {r.campaign_name}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === 'active'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {r.status === 'active' ? 'Ativo' : 'Pausado'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-white/50 text-xs whitespace-nowrap">
                        {r.period_start} → {r.period_end}
                      </td>
                      <td className="px-3 py-2.5 text-white whitespace-nowrap font-medium">{fmtBRL(r.spend)}</td>
                      <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{fmtInt(r.impressions)}</td>
                      <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{fmtInt(r.reach)}</td>
                      <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{fmtInt(r.clicks)}</td>
                      <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{fmtPct(r.ctr)}</td>
                      <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{fmtBRL(r.cpm)}</td>
                      <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{fmtBRL(r.cpc)}</td>
                      <td className="px-3 py-2.5 text-white/70 text-center">{r.results || '—'}</td>
                      <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{fmtBRL(r.cpa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botão confirmar */}
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="w-full py-3.5 rounded-2xl bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#f5d800] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              `Confirmar importação — ${rows.length} campanha${rows.length > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
