'use client'
import { PARAMETERS, getStatus, STATUS_COLORS, STATUS_LABELS, type ParamKey } from '@/lib/params'

type Props = {
  paramKey: ParamKey
  value: number | null | undefined
  trend: string | null
  isActive: boolean
  onClick: () => void
}

export default function StatCard({ paramKey, value, trend, isActive, onClick }: Props) {
  const p = PARAMETERS[paramKey]
  const status = getStatus(paramKey, value)
  const trendColor = trend === '↑'
    ? (p.higherIsBetter ? '#22c55e' : '#ef4444')
    : trend === '↓'
    ? (p.higherIsBetter ? '#ef4444' : '#22c55e')
    : '#475569'

  return (
    <div onClick={onClick} style={{
      background: isActive ? `linear-gradient(135deg, ${p.color}12, #0a0f1e)` : '#0a0f1e',
      border: `1px solid ${isActive ? p.color + '50' : '#0f172a'}`,
      borderRadius: 13, padding: '15px 17px', cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: isActive ? `0 0 20px ${p.color}15` : 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{p.label}</span>
        {value != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[status], background: STATUS_COLORS[status] + '18', padding: '2px 7px', borderRadius: 20 }}>
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>
      <div style={{ fontSize: 25, fontWeight: 800, color: value != null ? p.color : '#1e293b', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
        {value ?? '—'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
        <span style={{ fontSize: 11, color: '#334155' }}>{value != null ? p.unit : ''}</span>
        {trend && <span style={{ fontSize: 17, fontWeight: 800, color: trendColor }}>{trend}</span>}
      </div>
    </div>
  )
}
