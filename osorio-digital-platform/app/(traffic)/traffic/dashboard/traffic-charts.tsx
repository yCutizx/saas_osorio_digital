'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'

export type DailyPoint = {
  date:         string
  investimento: number
  conversoes:   number
  cliques:      number
  impressoes:   number
}

export type CampaignRow = {
  id:           string
  name:         string
  platform:     string
  spend:        number
  revenue:      number
  clicks:       number
  impressions:  number
  conversions:  number
  ctr:          number
  cpc:          number
  cpa:          number
  roas:         number
  result_type:  string
  campaignType: string
}

type Tab = 'investimento' | 'conversoes' | 'cliques' | 'impressoes'
type BarMetric = 'spend' | 'conversions' | 'clicks'

const TABS: { key: Tab; label: string; color: string; fmt: (v: number) => string }[] = [
  { key: 'investimento', label: 'Investimento', color: '#EACE00', fmt: (v) => `R$${v.toFixed(0)}` },
  { key: 'conversoes',   label: 'Conversões',   color: '#4ade80', fmt: (v) => String(Math.round(v)) },
  { key: 'cliques',      label: 'Cliques',      color: '#60a5fa', fmt: (v) => String(Math.round(v)) },
  { key: 'impressoes',   label: 'Impressões',   color: '#a78bfa', fmt: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)) },
]

const BAR_METRICS: { key: BarMetric; label: string }[] = [
  { key: 'spend',       label: 'Investimento' },
  { key: 'conversions', label: 'Conversões'   },
  { key: 'clicks',      label: 'Cliques'      },
]

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#f5f5f0',
    fontSize: '12px',
  },
  labelStyle: { color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
}

interface Props {
  dailyData:    DailyPoint[]
  campaignRows: CampaignRow[]
}

export function TrafficCharts({ dailyData, campaignRows }: Props) {
  const [activeTab,  setActiveTab]  = useState<Tab>('investimento')
  const [barMetric,  setBarMetric]  = useState<BarMetric>('spend')

  const tab = TABS.find((t) => t.key === activeTab)!

  return (
    <div className="space-y-5">

      {/* ── Gráfico 1: Linha com abas ─────────────────────────── */}
      <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={activeTab === t.key ? { background: t.color } : undefined}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === t.key
                  ? 'text-[#0A0A0A] font-semibold shadow-md'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {dailyData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-white/30 text-sm">
            Sem dados no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                tickLine={false} axisLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                tickLine={false} axisLine={false}
                tickFormatter={tab.fmt} width={56}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [tab.fmt(Number(v)), tab.label]}
              />
              <Line
                type="monotone"
                dataKey={activeTab}
                stroke={tab.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: tab.color, stroke: '#0A0A0A', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Gráfico 2: Performance por campanha ──────────────── */}
      <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
            Performance por Campanha
          </h3>
          <div className="flex gap-1 bg-black/40 rounded-lg p-1">
            {BAR_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setBarMetric(m.key)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  barMetric === m.key
                    ? 'bg-[#EACE00] text-black'
                    : 'text-white/40 hover:text-white'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {campaignRows.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-white/30 text-sm">
            Sem campanhas no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={campaignRows.slice(0, 6)}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                tickLine={false} axisLine={false}
                tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                tickLine={false} axisLine={false} width={48}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey={barMetric} radius={[5, 5, 0, 0]}>
                {campaignRows.slice(0, 6).map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? '#EACE00' : `rgba(234,206,0,${Math.max(0.25, 0.7 - i * 0.12)})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}
