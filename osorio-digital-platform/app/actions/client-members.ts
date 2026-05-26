'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_MEMBERS_PER_CLIENT } from '@/lib/client-members'

async function getAdminCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Sem permissão (apenas admin gerencia membros)' as const }
  }
  return { user, profile, admin }
}

function revalidate(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/edit`)
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) listAvailableProfilesAction — profiles role='client' NÃO vinculados ainda
// ─────────────────────────────────────────────────────────────────────────────

export async function listAvailableProfilesAction(clientId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  // IDs já vinculados ao cliente atual
  const { data: assignments } = await ctx.admin
    .from('client_assignments')
    .select('user_id')
    .eq('client_id', clientId)
    .eq('role', 'client')
  const linkedIds = new Set((assignments ?? []).map((a) => a.user_id as string))

  const { data: profiles, error } = await ctx.admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'client')
    .order('full_name')

  if (error) return { error: 'Erro ao listar profiles' }

  const available = (profiles ?? []).filter((p) => !linkedIds.has(p.id as string))
  return { ok: true as const, profiles: available }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) addExistingMemberAction — vincula profile já existente ao cliente
// ─────────────────────────────────────────────────────────────────────────────

const addExistingSchema = z.object({
  clientId: z.string().uuid(),
  userId:   z.string().uuid(),
})

export async function addExistingMemberAction(input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = addExistingSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos' }
  const { clientId, userId } = parsed.data

  // Limite de membros
  const { count } = await ctx.admin
    .from('client_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('role', 'client')
  if ((count ?? 0) >= MAX_MEMBERS_PER_CLIENT) {
    return { error: `Limite de ${MAX_MEMBERS_PER_CLIENT} membros por cliente atingido` }
  }

  // Confirma que o profile é role='client'
  const { data: profile } = await ctx.admin
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single()
  if (!profile)               return { error: 'Usuário não encontrado' }
  if (profile.role !== 'client') return { error: 'Usuário não é cliente' }

  const { error } = await ctx.admin
    .from('client_assignments')
    .insert({ client_id: clientId, user_id: userId, role: 'client' })

  if (error) {
    if (error.code === '23505') return { error: 'Usuário já está vinculado a este cliente' }
    return { error: 'Erro ao vincular: ' + error.message }
  }

  revalidate(clientId)
  return { ok: true as const }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) createAndAddMemberAction — cria usuário + profile + assignment
// ─────────────────────────────────────────────────────────────────────────────

const createMemberSchema = z.object({
  clientId:  z.string().uuid(),
  fullName:  z.string().min(2, 'Nome muito curto').max(120),
  email:     z.string().email('Email inválido').max(200),
  password:  z.string().min(8, 'Senha precisa de mínimo 8 caracteres').max(72),
})

export async function createAndAddMemberAction(input: unknown) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = createMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }
  const { clientId, fullName, email, password } = parsed.data

  // Limite
  const { count } = await ctx.admin
    .from('client_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('role', 'client')
  if ((count ?? 0) >= MAX_MEMBERS_PER_CLIENT) {
    return { error: `Limite de ${MAX_MEMBERS_PER_CLIENT} membros por cliente atingido` }
  }

  // Cria via supabase.auth.admin
  const { data: created, error: createErr } = await ctx.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? 'Erro desconhecido'
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
      return { error: 'Email já cadastrado. Use "Vincular usuário existente".' }
    }
    return { error: 'Erro ao criar usuário: ' + msg }
  }

  const newUserId = created.user.id

  // Insere profile (upsert pra cobrir caso de trigger automático)
  const { error: profileErr } = await ctx.admin
    .from('profiles')
    .upsert({
      id:        newUserId,
      email,
      full_name: fullName,
      role:      'client',
    }, { onConflict: 'id' })

  if (profileErr) {
    console.error('[createAndAddMember] profile upsert falhou:', profileErr.message)
    // Continua — assignment pode funcionar se profile já foi criado por trigger
  }

  // Insere assignment
  const { error: assignErr } = await ctx.admin
    .from('client_assignments')
    .insert({ client_id: clientId, user_id: newUserId, role: 'client' })

  if (assignErr) {
    return { error: 'Usuário criado, mas falhou ao vincular: ' + assignErr.message }
  }

  revalidate(clientId)
  return { ok: true as const, user_id: newUserId }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) removeMemberAction — remove só do client_assignments (não deleta profile)
// ─────────────────────────────────────────────────────────────────────────────

export async function removeMemberAction(clientId: string, userId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!clientId || !userId) return { error: 'IDs inválidos' }

  const { error } = await ctx.admin
    .from('client_assignments')
    .delete()
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .eq('role', 'client')

  if (error) return { error: 'Erro ao desvincular: ' + error.message }

  revalidate(clientId)
  return { ok: true as const }
}
