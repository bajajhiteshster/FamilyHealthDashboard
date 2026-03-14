'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { PARAMETERS, getStatus, STATUS_COLORS, STATUS_LABELS, type ParamKey, type Report } from '@/lib/params'

type Props = { reports: Report[]; paramKey: ParamKey; height: number; mini?: boolean }

const CustomTooltip = ({ active, payload, label, paramKey }: any) => {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  const key = paramKey as ParamKey
  const status = getStatus(key, value)
  const p = PARAMETERS[key]
  return (
    <div style={{ background: '#ffffff', border: `1px solid ${p.color}40`, borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>{label}</div>
      <div style={{ color: p.color, fontWeight: 800, fontSize: 20 }}>{value} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{p.unit}</span></div>
      <div style={{ color: STATUS_COLORS[status], fontSize: 11, marginTop: 4, fontWeight: 600 }}>{STATUS_LABELS[status]}</div>
    </div>
  )
}

export default function TrendChart({ reports, paramKey, height, mini }: Props) {
  const p = PARAMETERS[paramKey]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={reports} margin={{ top: 4, right: mini ? 4 : 16, left: mini ? -30 : 0, bottom: 0 }}>
        {!mini && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
        <XAxis dataKey="report_date" tick={{ fill: '#94a3b8', fontSize: mini ? 10 : 12 }} stroke="#e2e8f0" />
        <YAxis tick={{ fill: '#94a3b8', fontSize: mini ? 10 : 12 }} stroke="#e2e8f0" />
        <Tooltip content={<CustomTooltip paramKey={paramKey} />} />
        <ReferenceLine y={p.normal[0]} stroke="#22c55e" strokeDasharray="5 4" strokeOpacity={0.5} />
        <ReferenceLine y={p.normal[1]} stroke="#22c55e" strokeDasharray="5 4" strokeOpacity={0.5} />
        <Line type="monotone" dataKey={paramKey} stroke={p.color} strokeWidth={mini ? 2 : 2.5}
          dot={{ fill: p.color, r: mini ? 3 : 4, strokeWidth: 2, stroke: '#ffffff' }}
          activeDot={{ r: mini ? 5 : 6, strokeWidth: 2, stroke: '#ffffff' }}
          connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
