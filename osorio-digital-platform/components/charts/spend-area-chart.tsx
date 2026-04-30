'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export type SpendDataPoint = {
  date:        string
  investimento: number
  receita:     number
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?:   string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm space-y-1">
      <p className="text-white/50 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="text-white font-semibold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  data: SpendDataPoint[]
}

export function SpendAreaChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados para o período selecionado.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#EACE00" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#EACE00" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#34d399" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
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

        <Tooltip content={<CustomTooltip />} />

        <Legend
          formatter={(value) => (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}</span>
          )}
        />

        <Area
          type="monotone"
          dataKey="investimento"
          name="Investimento"
          stroke="#EACE00"
          strokeWidth={2}
          fill="url(#gradInvest)"
          dot={false}
          activeDot={{ r: 4, fill: '#EACE00' }}
        />
        <Area
          type="monotone"
          dataKey="receita"
          name="Receita"
          stroke="#34d399"
          strokeWidth={2}
          fill="url(#gradReceita)"
          dot={false}
          activeDot={{ r: 4, fill: '#34d399' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
