import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [sugar, bp, weight] = await Promise.all([
    supabase.from('blood_sugar').select('*').eq('user_id', user.id).order('recorded_at', { ascending: true }),
    supabase.from('blood_pressure').select('*').eq('user_id', user.id).order('recorded_at', { ascending: true }),
    supabase.from('weight_readings').select('*').eq('user_id', user.id).order('recorded_at', { ascending: true }),
  ])

  return NextResponse.json({
    blood_sugar: sugar.data || [],
    blood_pressure: bp.data || [],
    weight_readings: weight.data || [],
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { table, record } = await req.json()
  const allowed = ['blood_sugar', 'blood_pressure', 'weight_readings']
  if (!allowed.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const { data, error } = await supabase
    .from(table)
    .insert({ ...record, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ record: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { table, id } = await req.json()
  const allowed = ['blood_sugar', 'blood_pressure', 'weight_readings']
  if (!allowed.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
