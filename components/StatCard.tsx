'use client'
import { PARAMETERS, getStatus, STATUS_COLORS, STATUS_LABELS, type ParamKey } from '@/lib/params'

type Props = { paramKey: ParamKey; value: number | null | undefined; trend: string | null; isActive: boolean; onClick: () => void }

export default function StatCard({ paramKey, value, trend, isActive, onClick }: Props) {
  const p = PARAMETERS[paramKey]
  const status = getStatus(paramKey, value)
  const trendColor = trend === '↑'
    ? (p.higherIsBetter ? '#16a34a' : '#dc2626')
    : trend === '↓'
    ? (p.higherIsBetter ? '#dc2626' : '#16a34a')
    : '#94a3b8'

  return (
    <div onClick={onClick} style={{
      background: isActive ? `linear-gradient(135deg, ${p.color}12, #ffffff)` : '#ffffff',
      border: `1.5px solid ${isActive ? p.color : '#e2e8f0'}`,
      borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: isActive ? `0 4px 16px ${p.color}20` : '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{p.label}</span>
        {value != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[status], background: STATUS_COLORS[status] + '18', padding: '2px 7px', borderRadius: 20 }}>
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: value != null ? p.color : '#e2e8f0', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
        {value ?? '—'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{value != null ? p.unit : ''}</span>
        {trend && <span style={{ fontSize: 16, fontWeight: 800, color: trendColor }}>{trend}</span>}
      </div>
    </div>
  )
}
