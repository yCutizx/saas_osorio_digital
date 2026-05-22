'use client'

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { formatBRL } from '@/lib/finance'

export interface MRRPoint {
  month: string  // ex: "Jan/26"
  mrr:   number
}

export interface PaymentsPoint {
  month:    string  // ex: "Jan/26"
  em_dia:   number
  atrasado: number
}

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

function fmtY(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${Math.round(v)}`
}

interface Props {
  mrrData:      MRRPoint[]
  paymentsData: PaymentsPoint[]
}

export function FinanceCharts({ mrrData, paymentsData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
          MRR — últimos 6 meses
        </h3>
        {mrrData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-white/30 text-sm">
            Sem dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrrData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtY} width={64} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [formatBRL(Number(v ?? 0)), 'MRR']}
              />
              <Line
                type="monotone"
                dataKey="mrr"
                stroke="#EACE00"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#EACE00', stroke: '#0A0A0A', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
          Pagamentos: em dia vs atrasados
        </h3>
        {paymentsData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-white/30 text-sm">
            Sem dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={paymentsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtY} width={64} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => [formatBRL(Number(v ?? 0)), name === 'em_dia' ? 'Em dia' : 'Atrasado']}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
                formatter={(v) => v === 'em_dia' ? 'Em dia' : 'Atrasado'}
              />
              <Bar dataKey="em_dia"   stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
              <Bar dataKey="atrasado" stackId="a" fill="#EF4444" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
