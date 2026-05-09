'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createClientBoardAction(
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return { error: 'Acesso negado.' }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name || name.length < 2) return { error: 'O nome deve ter pelo menos 2 caracteres.' }

  const admin = createAdminClient()

  // Count boards already created by this client
  const { count } = await admin
    .from('kanban_boards')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)

  if ((count ?? 0) >= 3) return { error: 'Limite de 3 quadros atingido.' }

  const { data: board, error: insertErr } = await admin
    .from('kanban_boards')
    .insert({
      name,
      created_by:  user.id,
      board_type:  'content',
      color:       '#EACE00',
      columns:     [
        { id: 'todo',        label: 'A fazer',     color: '#555555' },
        { id: 'in_progress', label: 'Em andamento', color: '#EACE00' },
        { id: 'done',        label: 'Concluído',    color: '#22c55e' },
      ],
    })
    .select('id')
    .single()

  if (insertErr || !board) return { error: insertErr?.message ?? 'Erro ao criar quadro.' }

  // Add creator as member so the board detail page also works via membership check
  await admin.from('kanban_board_members').insert({
    board_id:   board.id,
    profile_id: user.id,
  })

  redirect('/client/kanban')
}
