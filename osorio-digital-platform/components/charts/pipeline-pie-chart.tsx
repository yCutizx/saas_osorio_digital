'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  source: string
  count: number
}

const SOURCE_COLORS: Record<string, string> = {
  whatsapp:  '#25D366',
  meta_ads:  '#0082FB',
  google:    '#EA4335',
  indicacao: '#F59E0B',
  site:      '#8B5CF6',
  manual:    '#6B7280',
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp:  'WhatsApp',
  meta_ads:  'Meta Ads',
  google:    'Google',
  indicacao: 'Indicação',
  site:      'Site',
  manual:    'Manual',
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: DataPoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-white/50 text-xs mb-1">{SOURCE_LABELS[item.payload.source] ?? item.payload.source}</p>
      <p className="text-white font-semibold">
        {item.value} lead{item.value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

interface Props {
  data: DataPoint[]
}

export function PipelinePieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555] text-sm">
        Sem dados para exibir.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="source"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={SOURCE_COLORS[entry.source] ?? '#6B7280'}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {SOURCE_LABELS[value] ?? value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
