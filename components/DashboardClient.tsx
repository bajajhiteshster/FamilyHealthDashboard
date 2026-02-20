'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PARAMETERS, getStatus, STATUS_COLORS, STATUS_LABELS, type ParamKey, type Report } from '@/lib/params'
import TrendChart from './TrendChart'
import StatCard from './StatCard'

type Props = {
  user: { id: string; email: string; name: string }
  initialReports: Report[]
}

const PARAM_KEYS = Object.keys(PARAMETERS) as ParamKey[]

export default function DashboardClient({ user, initialReports }: Props) {
  const [reports, setReports]         = useState<Report[]>(initialReports)
  const [activeParam, setActiveParam] = useState<ParamKey>('hba1c')
  const [activeTab, setActiveTab]     = useState<'overview' | 'trends' | 'history'>('overview')
  const [selectedParams, setSelected] = useState<ParamKey[]>(['hba1c', 'triglycerides', 'ldl', 'hdl'])
  const [showManual, setShowManual]   = useState(false)
  const [newEntry, setNewEntry]       = useState<any>({ report_date: '' })
  const [uploading, setUploading]     = useState(false)
  const [uploadLog, setUploadLog]     = useState<any[]>([])
  const [dragOver, setDragOver]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const latest = reports[reports.length - 1] || {}
  const prev   = reports[reports.length - 2] || {}

  const getTrend = (param: ParamKey) => {
    const l = latest[param], p = prev[param]
    if (!l || !p) return null
    return l > p ? '↑' : l < p ? '↓' : '→'
  }

  const toggleParam = (key: ParamKey) =>
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const processFiles = useCallback(async (files: File[]) => {
    setUploading(true)
    const logs: any[] = []
    for (const file of files) {
      if (!file.name.endsWith('.pdf')) {
        logs.push({ name: file.name, status: 'error', msg: 'Not a PDF' })
        setUploadLog([...logs])
        continue
      }
      logs.push({ name: file.name, status: 'processing', msg: 'Uploading PDF…' })
      setUploadLog([...logs])
      try {
        // Step 1: Upload PDF to Supabase Storage (no Vercel payload limit!)
        const storagePath = `${user.id}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(storagePath, file, { contentType: 'application/pdf' })
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        // Step 2: Tell server to extract from storage (only tiny JSON goes through Vercel)
        logs[logs.length - 1] = { name: file.name, status: 'processing', msg: 'Extracting with Claude AI…' }
        setUploadLog([...logs])

        const resp = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath, filename: file.name })
        })
        if (!resp.ok) throw new Error(await resp.text())
        const { report } = await resp.json()
        setReports(prev => [...prev, report].sort((a, b) => a.report_date.localeCompare(b.report_date)))
        logs[logs.length - 1] = { name: file.name, status: 'success', msg: `Extracted · ${report.report_date}` }
      } catch (e: any) {
        logs[logs.length - 1] = { name: file.name, status: 'error', msg: e.message }
      }
      setUploadLog([...logs])
    }
    setUploading(false)
  }, [user.id, supabase])

  const saveManual = async () => {
    if (!newEntry.report_date) return
    const record: any = { user_id: user.id, source: 'manual' }
    for (const [k, v] of Object.entries(newEntry)) {
      if (v !== '' && v !== undefined) record[k] = v
    }
    const { data, error } = await supabase.from('reports').insert(record).select().single()
    if (!error && data) {
      setReports(prev => [...prev, data].sort((a, b) => a.report_date.localeCompare(b.report_date)))
      setNewEntry({ report_date: '' })
      setShowManual(false)
    }
  }

  const deleteReport = async (id: string) => {
    await supabase.from('reports').delete().eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const s = { // shorthand styles
    card: { background: '#0a0f1e', border: '1px solid #0f172a', borderRadius: 16 } as React.CSSProperties,
    input: { width: '100%', background: '#060810', border: '1px solid #0f172a', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' as const },
    label: { display: 'block', fontSize: 11, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 } as React.CSSProperties,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06090f', color: '#e2e8f0', fontFamily: "'Sora','Segoe UI',sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(6,9,15,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #0a0f1e', padding: '0 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#dc2626,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🩸</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.4px', color: '#f8fafc' }}>BloodTrack <span style={{ color: '#dc2626' }}>AI</span></span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['overview', 'trends', 'history'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === tab ? '#0f172a' : 'transparent', color: activeTab === tab ? '#f8fafc' : '#475569', textTransform: 'capitalize' }}>{tab}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#334155', fontSize: 13 }}>👤 {user.name}</span>
            <button onClick={() => setShowManual(!showManual)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✏️ Manual</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#dc2626,#db2777)', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 3px 12px rgba(220,38,38,0.3)' }}>📄 Upload PDF</button>
            <button onClick={signOut} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 12 }}>Sign Out</button>
            <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={e => processFiles(Array.from(e.target.files || []))} />
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px' }}>

        {/* Drop Zone */}
        <div onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(Array.from(e.dataTransfer.files)) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
          onClick={() => !reports.length && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#dc2626' : '#0f172a'}`, borderRadius: reports.length ? 12 : 24,
            padding: reports.length ? '14px 20px' : '64px 40px', textAlign: 'center',
            cursor: reports.length ? 'default' : 'pointer', transition: 'all 0.2s',
            background: dragOver ? 'rgba(220,38,38,0.04)' : 'transparent', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexDirection: reports.length ? 'row' : 'column'
          }}>
          {reports.length ? (
            <>
              <span style={{ fontSize: 20 }}>{uploading ? '⏳' : '📄'}</span>
              <span style={{ color: '#334155', fontSize: 14 }}>{uploading ? 'Processing…' : 'Drop more PDF reports here'}</span>
            </>
          ) : (
            <>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🩺</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Upload Your Blood Reports</h2>
              <p style={{ color: '#475569', fontSize: 14 }}>Drop PDF files or click to browse · Claude AI extracts all values automatically</p>
            </>
          )}
        </div>

        {/* Upload Log */}
        {uploadLog.length > 0 && (
          <div style={{ ...s.card, padding: '16px 20px', marginBottom: 22 }}>
            {uploadLog.map((log, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < uploadLog.length - 1 ? '1px solid #060810' : 'none' }}>
                <span>{log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⏳'}</span>
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>{log.name}</span>
                <span style={{ color: log.status === 'success' ? '#22c55e' : log.status === 'error' ? '#ef4444' : '#f59e0b', fontSize: 12 }}>{log.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Manual Form */}
        {showManual && (
          <div style={{ ...s.card, padding: 26, marginBottom: 26 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 18 }}>Manual Entry</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
              <div>
                <label style={s.label}>Report Month</label>
                <input type="month" style={s.input} value={newEntry.report_date?.slice(0, 7) || ''} onChange={e => setNewEntry((p: any) => ({ ...p, report_date: e.target.value }))} />
              </div>
              {PARAM_KEYS.map(key => (
                <div key={key}>
                  <label style={s.label}>{PARAMETERS[key].label} <span style={{ color: '#1e293b' }}>({PARAMETERS[key].unit})</span></label>
                  <input type="number" step="0.01" placeholder="—" style={s.input} value={newEntry[key] || ''}
                    onChange={e => setNewEntry((p: any) => ({ ...p, [key]: e.target.value ? parseFloat(e.target.value) : '' }))} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={saveManual} style={{ background: 'linear-gradient(135deg,#dc2626,#db2777)', border: 'none', color: 'white', padding: '9px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Save</button>
              <button onClick={() => setShowManual(false)} style={{ background: '#0f172a', border: '1px solid #1e293b', color: '#64748b', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>No reports yet — upload a PDF or add manually</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 11, marginBottom: 26 }}>
                  {PARAM_KEYS.map(key => (
                    <StatCard key={key} paramKey={key} value={latest[key]} trend={getTrend(key)}
                      isActive={activeParam === key}
                      onClick={() => { setActiveParam(key); setActiveTab('trends') }} />
                  ))}
                </div>
                <div style={{ ...s.card, padding: '26px 30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{PARAMETERS[activeParam].label} Trend</h2>
                      <p style={{ margin: '3px 0 0', color: '#475569', fontSize: 12 }}>Normal: {PARAMETERS[activeParam].normal[0]}–{PARAMETERS[activeParam].normal[1]} {PARAMETERS[activeParam].unit}</p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {PARAM_KEYS.map(k => (
                        <button key={k} onClick={() => setActiveParam(k)} style={{
                          padding: '3px 10px', borderRadius: 20, border: `1px solid ${activeParam === k ? PARAMETERS[k].color : '#0f172a'}`,
                          background: activeParam === k ? PARAMETERS[k].color + '18' : 'transparent',
                          color: activeParam === k ? PARAMETERS[k].color : '#334155', cursor: 'pointer', fontSize: 11
                        }}>{PARAMETERS[k].label}</button>
                      ))}
                    </div>
                  </div>
                  <TrendChart reports={reports} paramKey={activeParam} height={240} />
                </div>
              </>
            )}
          </>
        )}

        {/* TRENDS */}
        {activeTab === 'trends' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
              <span style={{ color: '#475569', fontSize: 13, padding: '5px 0', marginRight: 4 }}>Compare:</span>
              {PARAM_KEYS.map(k => (
                <button key={k} onClick={() => toggleParam(k)} style={{
                  padding: '4px 12px', borderRadius: 20, border: `1px solid ${selectedParams.includes(k) ? PARAMETERS[k].color : '#0f172a'}`,
                  background: selectedParams.includes(k) ? PARAMETERS[k].color + '18' : 'transparent',
                  color: selectedParams.includes(k) ? PARAMETERS[k].color : '#334155', cursor: 'pointer', fontSize: 12
                }}>{PARAMETERS[k].label}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {selectedParams.map(key => {
                const p = PARAMETERS[key]
                const val = latest[key]
                const status = getStatus(key, val)
                return (
                  <div key={key} style={{ ...s.card, padding: '20px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <div style={{ color: p.color, fontWeight: 800, fontSize: 14 }}>{p.label}</div>
                        <div style={{ color: '#334155', fontSize: 11, marginTop: 2 }}>Normal: {p.normal[0]}–{p.normal[1]} {p.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: val != null ? STATUS_COLORS[status] : '#1e293b', fontSize: 22, fontWeight: 800 }}>{val ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#334155' }}>{p.unit}</div>
                      </div>
                    </div>
                    <TrendChart reports={reports} paramKey={key} height={100} mini />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div style={{ ...s.card, padding: '24px 28px', overflowX: 'auto' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginBottom: 20 }}>All Reports</h2>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#334155' }}>No reports yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #0f172a' }}>
                    <th style={{ textAlign: 'left', padding: '9px 12px', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '9px 12px', color: '#475569', fontWeight: 700 }}>Source</th>
                    {PARAM_KEYS.map(k => (
                      <th key={k} style={{ textAlign: 'center', padding: '9px 8px', color: PARAMETERS[k].color, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 11 }}>{PARAMETERS[k].label}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...reports].reverse().map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #060810' }}>
                      <td style={{ padding: '11px 12px', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.report_date}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontSize: 11, color: r.source === 'pdf' ? '#38bdf8' : '#64748b', background: r.source === 'pdf' ? '#38bdf822' : '#1e293b', padding: '2px 8px', borderRadius: 20 }}>
                          {r.source === 'pdf' ? `📄 ${r.filename || 'PDF'}` : '✏️ Manual'}
                        </span>
                      </td>
                      {PARAM_KEYS.map(k => {
                        const val = r[k]
                        const status = getStatus(k, val)
                        return (
                          <td key={k} style={{ textAlign: 'center', padding: '11px 8px' }}>
                            {val != null
                              ? <span style={{ color: STATUS_COLORS[status], fontWeight: 600, background: STATUS_COLORS[status] + '18', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>{val}</span>
                              : <span style={{ color: '#1e293b' }}>—</span>}
                          </td>
                        )
                      })}
                      <td style={{ padding: '11px 12px' }}>
                        <button onClick={() => deleteReport(r.id)} style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 15 }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 12, marginTop: 32, paddingBottom: 28 }}>
          For personal tracking only. Consult your doctor for medical advice.
        </p>
      </div>
    </div>
  )
}
