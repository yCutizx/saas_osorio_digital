import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Gate de acesso compartilhado entre recursos por cliente (arquivos, notas, etc).
// Arquivo comum (sem 'use server') porque exporta type/const/função sync —
// arquivos 'use server' só podem exportar funções async.

// Apenas equipe interna acessa recursos de cliente. 'client' (e qualquer outro)
// fica bloqueado nesta versão.
export const ALLOWED_ROLES = ['admin', 'traffic_manager', 'social_media']

const uuidSchema = z.string().uuid()
export function isValidId(id: string): boolean {
  return uuidSchema.safeParse(id).success
}

export type ClientCtx = {
  user:    { id: string }
  profile: { id: string; role: string }
  admin:   ReturnType<typeof createAdminClient>
}

export async function getClientCtx(): Promise<ClientCtx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil não encontrado' }
  if (!ALLOWED_ROLES.includes(profile.role)) return { error: 'Sem permissão' }

  return { user, profile, admin }
}

/**
 * Defesa em profundidade: ctx.admin usa service_role e BYPASSA o RLS, então o
 * escopo por cliente precisa ser checado explicitamente aqui. Admin vê tudo;
 * traffic_manager/social_media só clientes a que estão atribuídos.
 */
export async function assertClientAccess(
  ctx: ClientCtx,
  clientId: string,
): Promise<{ ok: true } | { error: string }> {
  if (ctx.profile.role === 'admin') return { ok: true }

  const { data } = await ctx.admin
    .from('client_assignments')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_id', ctx.user.id)
    .maybeSingle()

  if (!data) return { error: 'Sem acesso a este cliente' }
  return { ok: true }
}
