import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MemberRow } from './member-row'
import { AddMemberSheet } from './add-member-sheet'
import { MAX_MEMBERS_PER_CLIENT } from '@/lib/client-members'

interface Props {
  clientId: string
}

export async function ClientMembersSection({ clientId }: Props) {
  // Verifica que quem renderiza é admin (defesa em profundidade — page já valida)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null

  const admin = createAdminClient()

  // Membros vinculados (role='client') + dados do profile
  const { data: assignments } = await admin
    .from('client_assignments')
    .select('user_id, created_at, profiles!inner(id, full_name, email)')
    .eq('client_id', clientId)
    .eq('role', 'client')
    .order('created_at', { ascending: true })

  type Row = {
    user_id:    string
    created_at: string
    profiles:   { id: string; full_name: string | null; email: string } | null
  }
  const rows = ((assignments ?? []) as unknown as Row[]).filter((r) => r.profiles)

  // MFA status pra cada user_id (1 query)
  const userIds = rows.map((r) => r.user_id)
  const mfaMap = new Map<string, boolean>()
  if (userIds.length > 0) {
    const { data: mfaRows } = await admin
      .from('user_mfa')
      .select('user_id, enabled')
      .in('user_id', userIds)
    for (const m of mfaRows ?? []) {
      mfaMap.set(m.user_id as string, Boolean(m.enabled))
    }
  }

  const count = rows.length
  const atLimit = count >= MAX_MEMBERS_PER_CLIENT

  return (
    <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#EACE00]" />
          <h3 className="text-sm font-semibold text-[#F5F5F0]">
            Membros do cliente
            <span className="ml-2 text-xs text-[#666] font-normal">
              {count} / {MAX_MEMBERS_PER_CLIENT}
            </span>
          </h3>
        </div>
        <AddMemberSheet
          clientId={clientId}
          disabled={atLimit}
          disabledTooltip={`Limite de ${MAX_MEMBERS_PER_CLIENT} membros por cliente atingido`}
        />
      </div>

      <p className="text-xs text-[#888]">
        Cada pessoa do cliente faz login com seu próprio cadastro. Desvincular não deleta o usuário —
        apenas remove o acesso a este cliente específico.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-lg bg-[#0A0A0A] border border-[#222] p-6 text-center">
          <Users className="h-6 w-6 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/50">Nenhum membro vinculado ainda.</p>
          <p className="text-xs text-[#666] mt-1">Use o botão acima pra adicionar.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#222] rounded-lg border border-[#222] overflow-hidden">
          {rows.map((r) => (
            <MemberRow
              key={r.user_id}
              clientId={clientId}
              userId={r.user_id}
              fullName={r.profiles!.full_name}
              email={r.profiles!.email}
              linkedAt={r.created_at}
              mfaEnabled={mfaMap.get(r.user_id) ?? false}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
