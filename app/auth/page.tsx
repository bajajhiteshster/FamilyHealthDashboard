'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function AuthPage() {
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
        if (error) throw error
        if (!data.session) { setError('Account created! Please sign in.'); setLoading(false); setMode('login'); return }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session) throw new Error('No session returned')
      }
      await new Promise(r => setTimeout(r, 300))
      window.location.href = '/dashboard'
    } catch (err: any) { setError(err.message || 'Something went wrong'); setLoading(false) }
  }
  const inp: React.CSSProperties = { width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 16px', color:'#0f172a', fontSize:15, outline:'none' }
  const lbl: React.CSSProperties = { display:'block', fontSize:12, color:'#64748b', marginBottom:6, fontWeight:600 }
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,#dc2626,#db2777)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 16px', boxShadow:'0 8px 24px rgba(220,38,38,0.25)' }}>🩸</div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>BloodTrack</h1>
          <p style={{ color:'#64748b', marginTop:6, fontSize:14 }}>Family health monitoring dashboard</p>
        </div>
        <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:20, padding:32, boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', background:'#f8fafc', borderRadius:12, padding:4, marginBottom:28, border:'1px solid #e2e8f0' }}>
            {(['login','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, background:mode===m?'#ffffff':'transparent', color:mode===m?'#0f172a':'#94a3b8', boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.08)':'none', transition:'all 0.2s' }}>{m==='login'?'Sign In':'Create Account'}</button>
            ))}
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {mode==='signup' && <div><label style={lbl}>Your Name</label><input style={inp} placeholder="e.g. Rahul Sharma" value={name} onChange={e=>setName(e.target.value)} required /></div>}
            <div><label style={lbl}>Email Address</label><input style={inp} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
            <div><label style={lbl}>Password</label><input style={inp} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} /></div>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#dc2626', fontSize:13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px 0', borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer', background:loading?'#f1f5f9':'linear-gradient(135deg,#dc2626,#db2777)', color:loading?'#94a3b8':'white', fontWeight:700, fontSize:16, boxShadow:loading?'none':'0 4px 20px rgba(220,38,38,0.3)', marginTop:4, transition:'all 0.2s' }}>
              {loading?'Signing in…':mode==='login'?'Sign In':'Create Account'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', color:'#94a3b8', fontSize:13, marginTop:24 }}>Share this link with family members to create their own accounts.</p>
      </div>
    </div>
  )
}
