import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Receive pre-extracted report data from client (AI call happens browser-side)
  const { reportData } = await req.json()
  if (!reportData) return NextResponse.json({ error: 'No report data' }, { status: 400 })

  const record = { ...reportData, user_id: user.id }
  if (!record.report_date) record.report_date = new Date().toISOString().slice(0, 7)

  const { data, error } = await supabase.from('reports').insert(record).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ report: data })
}
