import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ClientPlan = 'basico' | 'pro' | 'premium'

const PLAN_LEVEL: Record<ClientPlan, number> = { basico: 0, pro: 1, premium: 2 }

export async function getClientPlan(): Promise<ClientPlan> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'basico'

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('clients(plan)')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = (assignment?.clients as any)?.plan as ClientPlan | null
  return plan ?? 'basico'
}

export async function requireMinPlan(min: ClientPlan) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'client') return

  const plan = await getClientPlan()
  const current = PLAN_LEVEL[plan] ?? 0
  const required = PLAN_LEVEL[min]

  if (current < required) redirect('/client/home?upgrade=1')
}
