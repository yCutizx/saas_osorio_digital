'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteClientAction(formData: FormData): Promise<void> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const clientId = formData.get('client_id') as string

  // Find the client's auth user before deleting
  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('user_id')
    .eq('client_id', clientId)
    .eq('role', 'client')
    .maybeSingle()

  // Delete client (cascades to client_assignments, campaigns, reports, etc.)
  await adminSupabase.from('clients').delete().eq('id', clientId)

  // Delete the client's auth account
  if (assignment?.user_id) {
    await adminSupabase.auth.admin.deleteUser(assignment.user_id)
  }

  revalidatePath('/admin/clients')
  redirect('/admin/clients')
}
