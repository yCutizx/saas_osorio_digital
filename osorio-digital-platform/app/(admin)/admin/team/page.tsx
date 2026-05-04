import Link from 'next/link'
import { UserPlus, TrendingUp, Camera, Users2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toggleActiveAction } from './[id]/actions'

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  traffic_manager: { label: 'Gestor de Tráfego', icon: TrendingUp, classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  social_media:    { label: 'Social Media',       icon: Camera,     classes: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
}

interface PageProps {
  searchParams: { created?: string; name?: string; pwd?: string }
}

export default async function AdminTeamPage({ searchParams }: PageProps) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const { data: members } = await adminSupabase
    .from('profiles')
    .select(`
      id, full_name, email, role, active, created_at,
      client_assignments(client_id, role, clients(name))
    `)
    .in('role', ['traffic_manager', 'social_media'])
    .order('full_name')

  return (
    <AppLayout pageTitle="Equipe">
      <div className="space-y-6">

        {/* Alerta de membro criado */}
        {searchParams.created === '1' && searchParams.name && searchParams.pwd && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/25 p-4 space-y-2">
            <p className="text-sm font-semibold text-green-400">
              Funcionário <span className="text-white">{searchParams.name}</span> criado com sucesso!
            </p>
            <p className="text-xs text-white/50">
              Senha temporária: <code className="font-mono text-white/80 bg-white/10 px-2 py-0.5 rounded">{searchParams.pwd}</code>
              <span className="ml-2 text-white/30">— guarde antes de sair desta página.</span>
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {members?.length ?? 0} {(members?.length ?? 0) === 1 ? 'funcionário' : 'funcionários'} cadastrados
          </p>
          <Link
            href="/admin/team/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-black font-semibold rounded-lg hover:bg-brand-yellow/90 transition-colors text-sm shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Novo Funcionário
          </Link>
        </div>

        {!members?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Users2 className="h-10 w-10 text-white/20" />
            <p className="text-muted-foreground text-sm">Nenhum funcionário cadastrado.</p>
            <Link href="/admin/team/new" className="text-brand-yellow text-sm hover:underline">
              Adicionar o primeiro funcionário
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {members.map((member) => {
              const roleConf = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.traffic_manager
              const RoleIcon = roleConf.icon
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const assignedClients = (member.client_assignments as any[])?.filter(
                (a) => a.role === member.role
              ) ?? []

              return (
                <div
                  key={member.id}
                  className={cn(
                    'rounded-2xl bg-[#111] border transition-all duration-200',
                    member.active
                      ? 'border-[#222] hover:border-[#EACE00]/30'
                      : 'border-[#1a1a1a] opacity-60'
                  )}
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#EACE00]/10 border border-[#EACE00]/20 flex items-center justify-center shrink-0">
                          <span className="text-[#EACE00] font-bold text-sm">
                            {(member.full_name ?? member.email).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[140px]">
                            {member.full_name ?? '—'}
                          </h3>
                          <p className="text-xs text-white/35 truncate mt-0.5">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={cn('w-2 h-2 rounded-full', member.active ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-white/20')} />
                      </div>
                    </div>

                    {/* Role badge */}
                    <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', roleConf.classes)}>
                      <RoleIcon className="h-3 w-3" />
                      {roleConf.label}
                    </span>

                    {/* Clientes */}
                    <div className="space-y-1 pt-1 border-t border-[#1a1a1a]">
                      <p className="text-xs text-white/25 mb-1.5">Clientes atribuídos</p>
                      {assignedClients.length === 0 ? (
                        <p className="text-xs text-white/20 italic">Nenhum cliente atribuído</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {assignedClients.slice(0, 4).map((a: any) => (
                            <span
                              key={a.client_id}
                              className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50"
                            >
                              {a.clients?.name ?? '—'}
                            </span>
                          ))}
                          {assignedClients.length > 4 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">
                              +{assignedClients.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#1a1a1a]">
                      <Link
                        href={`/admin/team/${member.id}`}
                        className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium text-white/50 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Ver detalhes
                      </Link>
                      <Link
                        href={`/admin/team/${member.id}/edit`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Editar
                      </Link>
                      <form action={toggleActiveAction}>
                        <input type="hidden" name="member_id" value={member.id} />
                        <input type="hidden" name="active" value={(!member.active).toString()} />
                        <button
                          type="submit"
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                            member.active
                              ? 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          )}
                        >
                          {member.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
