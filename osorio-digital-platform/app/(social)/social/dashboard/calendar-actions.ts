'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

// ── Criar calendário ──────────────────────────────────────────────────────────
export async function createCalendarAction(
  name: string,
  memberIds: string[],
): Promise<{ error?: string; id?: string }> {
  const user = await requireAdmin()
  if (!user) return { error: 'Acesso negado.' }
  if (!name.trim()) return { error: 'Nome obrigatório.' }

  const admin = createAdminClient()

  const { data: cal, error: calError } = await admin
    .from('custom_calendars')
    .insert({ name: name.trim(), created_by: user.id })
    .select('id')
    .single()

  if (calError || !cal) return { error: 'Erro ao criar calendário.' }

  if (memberIds.length > 0) {
    await admin.from('custom_calendar_members').insert(
      memberIds.map((uid) => ({ calendar_id: cal.id, user_id: uid }))
    )
  }

  revalidatePath('/social/dashboard')
  return { id: cal.id }
}

// ── Deletar calendário ────────────────────────────────────────────────────────
export async function deleteCalendarAction(calendarId: string): Promise<{ error?: string }> {
  const user = await requireAdmin()
  if (!user) return { error: 'Acesso negado.' }

  const admin = createAdminClient()
  await admin.from('custom_calendars').delete().eq('id', calendarId)

  revalidatePath('/social/dashboard')
  return {}
}

// ── Adicionar membro ──────────────────────────────────────────────────────────
export async function addCalendarMemberAction(
  calendarId: string,
  userId: string,
): Promise<{ error?: string }> {
  const user = await requireAdmin()
  if (!user) return { error: 'Acesso negado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('custom_calendar_members')
    .insert({ calendar_id: calendarId, user_id: userId })

  if (error) {
    if (error.code === '23505') return { error: 'Membro já adicionado.' }
    return { error: 'Erro ao adicionar membro.' }
  }

  revalidatePath('/social/dashboard')
  return {}
}

// ── Remover membro ────────────────────────────────────────────────────────────
export async function removeCalendarMemberAction(
  calendarId: string,
  userId: string,
): Promise<{ error?: string }> {
  const user = await requireAdmin()
  if (!user) return { error: 'Acesso negado.' }

  const admin = createAdminClient()
  await admin
    .from('custom_calendar_members')
    .delete()
    .eq('calendar_id', calendarId)
    .eq('user_id', userId)

  revalidatePath('/social/dashboard')
  return {}
}
