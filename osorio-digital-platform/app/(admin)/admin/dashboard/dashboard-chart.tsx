'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export type ChartDay = {
  date:      string
  created:   number
  approved:  number
  published: number
}

export function PostsChart({ data }: { data: ChartDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#555', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: '#555', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#888', marginBottom: 4 }}
          itemStyle={{ color: '#fff' }}
          cursor={{ stroke: '#333', strokeWidth: 1 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" iconSize={7} />
        <Line type="monotone" dataKey="created"   name="Criados"    stroke="#EACE00" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#EACE00' }} />
        <Line type="monotone" dataKey="approved"  name="Aprovados"  stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
        <Line type="monotone" dataKey="published" name="Publicados" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
