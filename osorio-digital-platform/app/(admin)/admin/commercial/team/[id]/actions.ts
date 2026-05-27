'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Toggle ativo do profile vendedor/SDR/closer.
 * Ao DESATIVAR: cascateia em client_sellers (desativa todos os vínculos ativos
 * do user) — evita engine gerar comissão pra desligado.
 * Ao REATIVAR: NÃO recria vínculos automaticamente — admin reatribui manual.
 */
export async function toggleActiveSellerAction(formData: FormData) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const sellerId = formData.get('seller_id') as string
  const active   = formData.get('active') === 'true'
  if (!sellerId) return

  // Confirma que é um seller comercial (proteção)
  const { data: target } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', sellerId)
    .maybeSingle()
  if (!target || !['vendedor', 'sdr', 'closer'].includes(target.role)) return

  const now = new Date().toISOString()

  await admin
    .from('profiles')
    .update({ active, updated_at: now })
    .eq('id', sellerId)

  // Ao DESATIVAR: cascateia em client_sellers
  if (!active) {
    await admin
      .from('client_sellers')
      .update({ active: false, deactivated_at: now })
      .eq('user_id', sellerId)
      .eq('active', true)
  }

  revalidatePath('/admin/commercial/team')
  revalidatePath(`/admin/commercial/team/${sellerId}`)
  revalidatePath('/admin/commercial')
}
