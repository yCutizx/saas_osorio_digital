'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

export type CampaignDataPoint = {
  campanha:    string
  plataforma:  string
  investimento: number
  receita:     number
  conversoes:  number
}

const PLATFORM_COLORS: Record<string, string> = {
  meta:     '#1877F2',
  google:   '#EACE00',
  tiktok:   '#ff0050',
  linkedin: '#0077b5',
  other:    '#888888',
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?:   string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm space-y-1 max-w-[220px]">
      <p className="text-white/50 text-xs mb-2 truncate">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-white/70 text-xs">{p.name}</span>
          </div>
          <span className="text-white font-semibold text-xs">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  data: CampaignDataPoint[]
}

export function CampaignBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados para o período selecionado.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

        <XAxis
          dataKey="campanha"
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={80}
          tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat('pt-BR', {
              style: 'currency', currency: 'BRL',
              notation: 'compact', maximumFractionDigits: 1,
            }).format(v)
          }
          width={68}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

        <Legend
          formatter={(value) => (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}</span>
          )}
        />

        <Bar dataKey="investimento" name="Investimento" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-invest-${index}`}
              fill={PLATFORM_COLORS[entry.plataforma] ?? PLATFORM_COLORS.other}
              fillOpacity={0.9}
            />
          ))}
        </Bar>

        <Bar dataKey="receita" name="Receita" fill="#34d399" fillOpacity={0.7} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
