import { StickyNote } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientNotesManager, type ClientNote } from './client-notes-manager'

export async function ClientNotesSection({ clientId }: { clientId: string }) {
  // Usuário atual: define quem pode ver o botão "editar" (só o autor).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: notes } = await admin
    .from('client_notes')
    .select('id, client_id, content, created_at, updated_at, author_id, author:author_id(full_name, email)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return (
    <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-[#EACE00]" />
        <h3 className="text-sm font-semibold text-[#F5F5F0]">Notas do cliente</h3>
      </div>
      <p className="text-xs text-[#888]">
        Anotações da equipe sobre o cliente. Só o autor edita; admin pode remover.
      </p>

      <ClientNotesManager
        clientId={clientId}
        initialNotes={(notes ?? []) as unknown as ClientNote[]}
        currentUserId={user?.id ?? ''}
      />
    </section>
  )
}
