'use client'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

type BloodSugar    = { id: string; value: number; type: string; notes?: string; recorded_at: string }
type BloodPressure = { id: string; systolic: number; diastolic: number; pulse?: number; notes?: string; recorded_at: string }
type WeightReading = { id: string; weight_kg: number; height_cm?: number; bmi?: number; notes?: string; recorded_at: string }

type Props = { userId: string }

const fmt = (dt: string) => new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
const fmtFull = (dt: string) => new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function getBpStatus(s: number, d: number) {
  if (s < 120 && d < 80) return { label: 'Normal', color: '#22c55e' }
  if (s < 130 && d < 80) return { label: 'Elevated', color: '#f59e0b' }
  if (s < 140 || d < 90) return { label: 'High Stage 1', color: '#f97316' }
  return { label: 'High Stage 2', color: '#ef4444' }
}

function getSugarStatus(v: number, type: string) {
  if (type === 'fasting') {
    if (v < 100) return { label: 'Normal', color: '#22c55e' }
    if (v < 126) return { label: 'Borderline', color: '#f59e0b' }
    return { label: 'High', color: '#ef4444' }
  }
  if (type === 'post_meal') {
    if (v < 140) return { label: 'Normal', color: '#22c55e' }
    if (v < 200) return { label: 'Borderline', color: '#f59e0b' }
    return { label: 'High', color: '#ef4444' }
  }
  if (v < 140) return { label: 'Normal', color: '#22c55e' }
  if (v < 200) return { label: 'Borderline', color: '#f59e0b' }
  return { label: 'High', color: '#ef4444' }
}

function getBmiStatus(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#f59e0b' }
  if (bmi < 25)   return { label: 'Normal', color: '#22c55e' }
  if (bmi < 30)   return { label: 'Overweight', color: '#f97316' }
  return { label: 'Obese', color: '#ef4444' }
}

export default function QuickReadings({ userId }: Props) {
  const [open, setOpen]       = useState(false)
  const [tab, setTab]         = useState<'sugar' | 'bp' | 'weight'>('bp')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  const [sugarData,  setSugarData]  = useState<BloodSugar[]>([])
  const [bpData,     setBpData]     = useState<BloodPressure[]>([])
  const [weightData, setWeightData] = useState<WeightReading[]>([])

  // Form state
  const [sugarForm,  setSugarForm]  = useState({ value: '', type: 'fasting', notes: '', recorded_at: '' })
  const [bpForm,     setBpForm]     = useState({ systolic: '', diastolic: '', pulse: '', notes: '', recorded_at: '' })
  const [weightForm, setWeightForm] = useState({ weight_kg: '', height_cm: '', notes: '', recorded_at: '' })

  useEffect(() => {
    if (open) fetchReadings()
  }, [open])

  const fetchReadings = async () => {
    setLoading(true)
    const res = await fetch('/api/readings')
    if (res.ok) {
      const d = await res.json()
      setSugarData(d.blood_sugar)
      setBpData(d.blood_pressure)
      setWeightData(d.weight_readings)
    }
    setLoading(false)
  }

  const saveReading = async () => {
    setSaving(true)
    try {
      let table = '', record: any = {}
      const now = new Date().toISOString()

      if (tab === 'sugar') {
        if (!sugarForm.value) return
        table = 'blood_sugar'
        record = { value: parseFloat(sugarForm.value), type: sugarForm.type, notes: sugarForm.notes || null, recorded_at: sugarForm.recorded_at || now }
      } else if (tab === 'bp') {
        if (!bpForm.systolic || !bpForm.diastolic) return
        table = 'blood_pressure'
        record = { systolic: parseFloat(bpForm.systolic), diastolic: parseFloat(bpForm.diastolic), pulse: bpForm.pulse ? parseFloat(bpForm.pulse) : null, notes: bpForm.notes || null, recorded_at: bpForm.recorded_at || now }
      } else {
        if (!weightForm.weight_kg) return
        table = 'weight_readings'
        const w = parseFloat(weightForm.weight_kg)
        const h = weightForm.height_cm ? parseFloat(weightForm.height_cm) : null
        const bmi = h ? parseFloat((w / ((h / 100) ** 2)).toFixed(1)) : null
        record = { weight_kg: w, height_cm: h, bmi, notes: weightForm.notes || null, recorded_at: weightForm.recorded_at || now }
      }

      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, record })
      })
      if (res.ok) {
        const { record: saved } = await res.json()
        if (tab === 'sugar')  setSugarData(p => [...p, saved].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)))
        if (tab === 'bp')     setBpData(p => [...p, saved].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)))
        if (tab === 'weight') setWeightData(p => [...p, saved].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)))
        setSugarForm({ value: '', type: 'fasting', notes: '', recorded_at: '' })
        setBpForm({ systolic: '', diastolic: '', pulse: '', notes: '', recorded_at: '' })
        setWeightForm({ weight_kg: '', height_cm: '', notes: '', recorded_at: '' })
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteReading = async (table: string, id: string) => {
    await fetch('/api/readings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, id }) })
    if (table === 'blood_sugar')    setSugarData(p => p.filter(r => r.id !== id))
    if (table === 'blood_pressure') setBpData(p => p.filter(r => r.id !== id))
    if (table === 'weight_readings') setWeightData(p => p.filter(r => r.id !== id))
  }

  const s = {
    inp: { width: '100%', background: '#060810', border: '1px solid #1e293b', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' } as React.CSSProperties,
    lbl: { display: 'block', fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' } as React.CSSProperties,
  }

  const latestBp     = bpData[bpData.length - 1]
  const latestSugar  = sugarData[sugarData.length - 1]
  const latestWeight = weightData[weightData.length - 1]

  return (
    <>
      {/* Floating Button */}
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        background: 'linear-gradient(135deg, #dc2626, #db2777)',
        color: 'white',
        fontSize: 28,
        lineHeight: 1,
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(220,38,38,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitTransform: 'translate3d(0,0,0)',
        transform: 'translate3d(0,0,0)',
        willChange: 'transform',
        touchAction: 'manipulation',
      }} title="Add Quick Reading">
        +
      </button>

      {/* Drawer Overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          {/* Backdrop */}
          <div onClick={() => { setOpen(false); setShowForm(false) }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

          {/* Drawer */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 520, minHeight: '60vh', maxHeight: '100vh', background: '#0a0f1e', borderLeft: '1px solid #1e293b', borderTop: '1px solid #1e293b', borderRadius: '16px 0 0 0', overflowY: 'auto', padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Quick Readings</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>Blood sugar, pressure & weight</p>
              </div>
              <button onClick={() => { setOpen(false); setShowForm(false) }} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', background: '#060810', borderRadius: 10, padding: 3, gap: 2 }}>
              {([['bp', '🫀 BP'], ['sugar', '🩸 Sugar'], ['weight', '⚖️ Weight']] as const).map(([t, label]) => (
                <button key={t} onClick={() => { setTab(t); setShowForm(false) }} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: tab === t ? '#1e293b' : 'transparent',
                  color: tab === t ? '#f1f5f9' : '#475569',
                }}>{label}</button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', color: '#334155', padding: 40 }}>Loading…</div>
            ) : (
              <>
                {/* ── BLOOD PRESSURE ── */}
                {tab === 'bp' && (
                  <>
                    {/* Latest card */}
                    {latestBp && (() => {
                      const st = getBpStatus(latestBp.systolic, latestBp.diastolic)
                      return (
                        <div style={{ background: '#060810', borderRadius: 14, padding: '18px 20px', border: `1px solid ${st.color}30` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Latest Reading</div>
                              <div style={{ fontSize: 32, fontWeight: 800, color: st.color, letterSpacing: '-1px' }}>{latestBp.systolic}<span style={{ fontSize: 18, color: '#475569' }}>/{latestBp.diastolic}</span></div>
                              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>mmHg {latestBp.pulse ? `· ${latestBp.pulse} bpm` : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ background: st.color + '20', color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                              <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>{fmt(latestBp.recorded_at)}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Chart */}
                    {bpData.length > 1 && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>Trend</div>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={bpData.map(r => ({ ...r, date: fmt(r.recorded_at) }))} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                            <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#334155', fontSize: 10 }} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                            <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.4} />
                            <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.3} />
                            <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} name="Systolic" />
                            <Line type="monotone" dataKey="diastolic" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }} name="Diastolic" />
                          </LineChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#475569' }}>
                          <span style={{ color: '#ef4444' }}>— Systolic</span>
                          <span style={{ color: '#38bdf8' }}>— Diastolic</span>
                        </div>
                      </div>
                    )}

                    {/* History */}
                    {bpData.length > 0 && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[...bpData].reverse().slice(0, 10).map(r => {
                            const st = getBpStatus(r.systolic, r.diastolic)
                            return (
                              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#0a0f1e', borderRadius: 8 }}>
                                <div>
                                  <span style={{ color: st.color, fontWeight: 700, fontSize: 15 }}>{r.systolic}/{r.diastolic}</span>
                                  <span style={{ color: '#475569', fontSize: 12, marginLeft: 8 }}>mmHg {r.pulse ? `· ${r.pulse} bpm` : ''}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 11, color: '#334155' }}>{fmtFull(r.recorded_at)}</span>
                                  <button onClick={() => deleteReading('blood_pressure', r.id)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add Form */}
                    {showForm && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '18px 20px', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Add Reading</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                          <div><label style={s.lbl}>Systolic (mmHg)</label><input style={s.inp} type="number" placeholder="120" value={bpForm.systolic} onChange={e => setBpForm(p => ({ ...p, systolic: e.target.value }))} /></div>
                          <div><label style={s.lbl}>Diastolic (mmHg)</label><input style={s.inp} type="number" placeholder="80" value={bpForm.diastolic} onChange={e => setBpForm(p => ({ ...p, diastolic: e.target.value }))} /></div>
                          <div><label style={s.lbl}>Pulse (bpm)</label><input style={s.inp} type="number" placeholder="72" value={bpForm.pulse} onChange={e => setBpForm(p => ({ ...p, pulse: e.target.value }))} /></div>
                          <div><label style={s.lbl}>Date & Time</label><input style={s.inp} type="datetime-local" value={bpForm.recorded_at} onChange={e => setBpForm(p => ({ ...p, recorded_at: e.target.value }))} /></div>
                        </div>
                        <div style={{ marginBottom: 14 }}><label style={s.lbl}>Notes (optional)</label><input style={s.inp} placeholder="After exercise, stressed…" value={bpForm.notes} onChange={e => setBpForm(p => ({ ...p, notes: e.target.value }))} /></div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={saveReading} disabled={saving} style={{ background: 'linear-gradient(135deg,#dc2626,#db2777)', border: 'none', color: 'white', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{saving ? 'Saving…' : 'Save'}</button>
                          <button onClick={() => setShowForm(false)} style={{ background: '#1e293b', border: 'none', color: '#64748b', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── BLOOD SUGAR ── */}
                {tab === 'sugar' && (
                  <>
                    {latestSugar && (() => {
                      const st = getSugarStatus(latestSugar.value, latestSugar.type)
                      return (
                        <div style={{ background: '#060810', borderRadius: 14, padding: '18px 20px', border: `1px solid ${st.color}30` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Latest · {latestSugar.type.replace('_', ' ')}</div>
                              <div style={{ fontSize: 32, fontWeight: 800, color: st.color }}>{latestSugar.value} <span style={{ fontSize: 14, color: '#475569', fontWeight: 400 }}>mg/dL</span></div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ background: st.color + '20', color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                              <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>{fmt(latestSugar.recorded_at)}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {sugarData.length > 1 && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>Trend</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={sugarData.map(r => ({ ...r, date: fmt(r.recorded_at) }))} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                            <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#334155', fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.4} label={{ value: 'Normal', fill: '#22c55e', fontSize: 10 }} />
                            <ReferenceLine y={126} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.3} />
                            <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} name="Blood Sugar" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {sugarData.length > 0 && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[...sugarData].reverse().slice(0, 10).map(r => {
                            const st = getSugarStatus(r.value, r.type)
                            return (
                              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#0a0f1e', borderRadius: 8 }}>
                                <div>
                                  <span style={{ color: st.color, fontWeight: 700, fontSize: 15 }}>{r.value}</span>
                                  <span style={{ color: '#475569', fontSize: 12, marginLeft: 6 }}>mg/dL · {r.type.replace('_', ' ')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 11, color: '#334155' }}>{fmtFull(r.recorded_at)}</span>
                                  <button onClick={() => deleteReading('blood_sugar', r.id)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {showForm && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '18px 20px', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Add Reading</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                          <div><label style={s.lbl}>Value (mg/dL)</label><input style={s.inp} type="number" placeholder="95" value={sugarForm.value} onChange={e => setSugarForm(p => ({ ...p, value: e.target.value }))} /></div>
                          <div>
                            <label style={s.lbl}>Type</label>
                            <select style={{ ...s.inp }} value={sugarForm.type} onChange={e => setSugarForm(p => ({ ...p, type: e.target.value }))}>
                              <option value="fasting">Fasting</option>
                              <option value="post_meal">Post Meal</option>
                              <option value="random">Random</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: '1/-1' }}><label style={s.lbl}>Date & Time</label><input style={s.inp} type="datetime-local" value={sugarForm.recorded_at} onChange={e => setSugarForm(p => ({ ...p, recorded_at: e.target.value }))} /></div>
                        </div>
                        <div style={{ marginBottom: 14 }}><label style={s.lbl}>Notes (optional)</label><input style={s.inp} placeholder="Before breakfast, after walk…" value={sugarForm.notes} onChange={e => setSugarForm(p => ({ ...p, notes: e.target.value }))} /></div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={saveReading} disabled={saving} style={{ background: 'linear-gradient(135deg,#dc2626,#db2777)', border: 'none', color: 'white', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{saving ? 'Saving…' : 'Save'}</button>
                          <button onClick={() => setShowForm(false)} style={{ background: '#1e293b', border: 'none', color: '#64748b', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── WEIGHT ── */}
                {tab === 'weight' && (
                  <>
                    {latestWeight && (() => {
                      const bmiSt = latestWeight.bmi ? getBmiStatus(latestWeight.bmi) : null
                      return (
                        <div style={{ background: '#060810', borderRadius: 14, padding: '18px 20px', border: `1px solid ${bmiSt?.color || '#1e293b'}30` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Latest</div>
                              <div style={{ fontSize: 32, fontWeight: 800, color: '#fbbf24' }}>{latestWeight.weight_kg} <span style={{ fontSize: 14, color: '#475569', fontWeight: 400 }}>kg</span></div>
                              {latestWeight.bmi && <div style={{ fontSize: 13, color: bmiSt?.color, marginTop: 4, fontWeight: 600 }}>BMI {latestWeight.bmi}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {bmiSt && <span style={{ background: bmiSt.color + '20', color: bmiSt.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{bmiSt.label}</span>}
                              <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>{fmt(latestWeight.recorded_at)}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {weightData.length > 1 && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>Weight Trend</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={weightData.map(r => ({ ...r, date: fmt(r.recorded_at) }))} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                            <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#334155', fontSize: 10 }} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                            <Line type="monotone" dataKey="weight_kg" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }} name="Weight (kg)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {weightData.length > 0 && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[...weightData].reverse().slice(0, 10).map(r => {
                            const bmiSt = r.bmi ? getBmiStatus(r.bmi) : null
                            return (
                              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#0a0f1e', borderRadius: 8 }}>
                                <div>
                                  <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 15 }}>{r.weight_kg} kg</span>
                                  {r.bmi && <span style={{ color: bmiSt?.color, fontSize: 12, marginLeft: 8 }}>BMI {r.bmi}</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 11, color: '#334155' }}>{fmtFull(r.recorded_at)}</span>
                                  <button onClick={() => deleteReading('weight_readings', r.id)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {showForm && (
                      <div style={{ background: '#060810', borderRadius: 14, padding: '18px 20px', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Add Reading</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                          <div><label style={s.lbl}>Weight (kg)</label><input style={s.inp} type="number" step="0.1" placeholder="70.5" value={weightForm.weight_kg} onChange={e => setWeightForm(p => ({ ...p, weight_kg: e.target.value }))} /></div>
                          <div><label style={s.lbl}>Height (cm) <span style={{ color: '#334155' }}>optional</span></label><input style={s.inp} type="number" placeholder="175" value={weightForm.height_cm} onChange={e => setWeightForm(p => ({ ...p, height_cm: e.target.value }))} /></div>
                          <div style={{ gridColumn: '1/-1' }}><label style={s.lbl}>Date & Time</label><input style={s.inp} type="datetime-local" value={weightForm.recorded_at} onChange={e => setWeightForm(p => ({ ...p, recorded_at: e.target.value }))} /></div>
                        </div>
                        <div style={{ marginBottom: 14 }}><label style={s.lbl}>Notes (optional)</label><input style={s.inp} placeholder="Morning, after gym…" value={weightForm.notes} onChange={e => setWeightForm(p => ({ ...p, notes: e.target.value }))} /></div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={saveReading} disabled={saving} style={{ background: 'linear-gradient(135deg,#dc2626,#db2777)', border: 'none', color: 'white', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{saving ? 'Saving…' : 'Save'}</button>
                          <button onClick={() => setShowForm(false)} style={{ background: '#1e293b', border: 'none', color: '#64748b', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Add Reading Button */}
                {!showForm && (
                  <button onClick={() => setShowForm(true)} style={{
                    width: '100%', padding: '12px', borderRadius: 10, border: '1px dashed #1e293b',
                    background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    transition: 'all 0.15s'
                  }}>
                    + Add {tab === 'bp' ? 'BP' : tab === 'sugar' ? 'Blood Sugar' : 'Weight'} Reading
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
