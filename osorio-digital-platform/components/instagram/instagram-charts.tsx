'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

export type IGDailyPoint = {
  date:           string  // dd/MM formatado
  impressoes:     number  // legacy — não plotada (API v25 não devolve daily)
  alcance:        number
  visitas_perfil: number  // legacy — não plotada
  cliques_link:   number  // legacy — não plotada
  seguidores:     number
}

export type IGCTABreakdown = {
  email:       number
  telefone:    number
  whatsapp:    number
  localizacao: number
}

// v25 só tem dado diário pra reach e follower_count — as outras métricas vêm
// agregadas do período (mostradas no Hero Card como números únicos).
type Tab = 'alcance' | 'seguidores'

const TABS: { key: Tab; label: string; color: string; fmt: (v: number) => string }[] = [
  { key: 'alcance',    label: 'Alcance diário',  color: '#10B981', fmt: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)) },
  { key: 'seguidores', label: 'Seguidores',      color: '#EACE00', fmt: (v) => String(Math.round(v)) },
]

const CTA_COLORS = ['#EACE00', '#3B82F6', '#10B981', '#F97316']

const TOOLTIP_STYLE = {
  contentStyle: {
    background:   '#1a1a1a',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color:        '#f5f5f0',
    fontSize:     '12px',
  },
  labelStyle: { color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
}

interface Props {
  dailyData:    IGDailyPoint[]
  ctaBreakdown: IGCTABreakdown
}

export function InstagramCharts({ dailyData, ctaBreakdown }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('alcance')
  const tab = TABS.find((t) => t.key === activeTab)!

  const ctaPie = [
    { name: 'E-mail',      value: ctaBreakdown.email },
    { name: 'Telefone',    value: ctaBreakdown.telefone },
    { name: 'WhatsApp',    value: ctaBreakdown.whatsapp },
    { name: 'Localização', value: ctaBreakdown.localizacao },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-5">
      {/* ── Line chart: só alcance + seguidores (únicos com daily na v25) ── */}
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
                  : 'text-white/40 hover:text-white hover:bg-white/5',
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
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [tab.fmt(Number(v)), tab.label]} />
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

        <p className="text-[10px] text-white/30 mt-2">
          Impressões, visitas no perfil e cliques no link vêm agregados no Hero acima — a API v25 não expõe esses valores dia-a-dia.
        </p>
      </div>

      {/* ── Donut de CTAs (só renderiza se houver algum > 0) ─────────────── */}
      {ctaPie.length > 0 && (
        <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
            Distribuição de CTAs do perfil
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ctaPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
              >
                {ctaPie.map((_, i) => (
                  <Cell key={i} fill={CTA_COLORS[i % CTA_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
