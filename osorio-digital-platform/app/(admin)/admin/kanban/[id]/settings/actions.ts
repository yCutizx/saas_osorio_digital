'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

export async function addBoardMemberAction(boardId: string, profileId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Sem permissão' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('kanban_board_members')
    .insert({ board_id: boardId, profile_id: profileId })

  if (error) {
    if (error.code === '23505') return { error: 'Membro já adicionado' }
    return { error: 'Erro ao adicionar membro' }
  }

  const { data: board } = await admin.from('kanban_boards').select('name').eq('id', boardId).single()
  await createNotification({
    userId: profileId,
    type: 'kanban_member_added',
    title: 'Adicionado a um quadro',
    message: `Você foi adicionado ao quadro "${board?.name ?? 'Kanban'}"`,
    link: `/admin/kanban/${boardId}`,
  })

  revalidatePath(`/admin/kanban/${boardId}/settings`)
  return {}
}

export async function removeBoardMemberAction(boardId: string, profileId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Sem permissão' }

  const admin = createAdminClient()
  await admin
    .from('kanban_board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('profile_id', profileId)

  revalidatePath(`/admin/kanban/${boardId}/settings`)
  return {}
}

export async function updateBoardSettingsAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Sem permissão' }

  const boardId   = formData.get('board_id') as string | null
  const name      = (formData.get('name') as string | null)?.trim()
  const clientId  = (formData.get('client_id') as string | null) || null
  const memberIds = (formData.getAll('member_ids') as string[]).filter(Boolean)

  if (!boardId || !name || name.length < 1) return { error: 'Nome obrigatório.' }

  const admin = createAdminClient()

  // Update board name and client
  const { error: updateErr } = await admin.from('kanban_boards').update({
    name,
    client_id: clientId,
  }).eq('id', boardId)

  if (updateErr) return { error: updateErr.message }

  // Replace all members: delete existing, insert new
  await admin.from('kanban_board_members').delete().eq('board_id', boardId)

  if (memberIds.length > 0) {
    await admin.from('kanban_board_members').insert(
      memberIds.map((pid) => ({ board_id: boardId, profile_id: pid })),
    )
  }

  revalidatePath(`/admin/kanban/${boardId}/settings`)
  revalidatePath(`/admin/kanban/${boardId}`)
  revalidatePath('/admin/kanban')
  return { success: true }
}
