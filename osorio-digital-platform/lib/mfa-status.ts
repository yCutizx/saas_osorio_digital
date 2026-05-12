import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { cookies }           from 'next/headers'

export interface MfaStatus {
  isEnabled:  boolean
  isVerified: boolean
}

export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isEnabled: false, isVerified: false }

  const admin = createAdminClient()
  const { data: mfa } = await admin
    .from('user_mfa')
    .select('enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  const isEnabled   = mfa?.enabled === true
  const cookieStore = cookies()
  const isVerified  = cookieStore.get('mfa_verified')?.value === user.id

  return { isEnabled, isVerified }
}

export async function isDeviceTrusted(userId: string): Promise<boolean> {
  const cookieStore = cookies()
  const deviceToken = cookieStore.get('trusted_device')?.value
  if (!deviceToken) return false

  const admin = createAdminClient()
  const { data } = await admin
    .from('trusted_devices')
    .select('id')
    .eq('user_id', userId)
    .eq('device_token', deviceToken)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  return !!data
}
