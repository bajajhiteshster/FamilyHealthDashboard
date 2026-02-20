import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('report_date', { ascending: true })

  return (
    <DashboardClient
      user={{ id: user.id, email: user.email!, name: profile?.name || user.email! }}
      initialReports={reports || []}
    />
  )
}
