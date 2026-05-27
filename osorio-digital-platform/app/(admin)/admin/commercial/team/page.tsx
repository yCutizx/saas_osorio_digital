import Link from 'next/link'
import { UserPlus, HandCoins, Phone, Handshake, Users2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'
import { toggleActiveSellerAction } from './[id]/actions'

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  vendedor: { label: 'Vendedor', icon: HandCoins, classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  sdr:      { label: 'SDR',      icon: Phone,     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  closer:   { label: 'Closer',   icon: Handshake, classes: 'bg-green-500/15 text-green-400 border-green-500/25' },
}

interface PageProps {
  searchParams: { created?: string; name?: string; pwd?: string }
}

export default async function CommercialTeamPage({ searchParams }: PageProps) {
  const admin = createAdminClient()

  // Auth guard já feito no layout pai (/admin/commercial/layout.tsx)
  const { data: sellers } = await admin
    .from('profiles')
    .select(`
      id, full_name, email, role, active, created_at,
      client_sellers(client_id, seller_role, active, clients(name))
    `)
    .in('role', ['vendedor', 'sdr', 'closer'])
    .order('full_name')

  return (
    <div className="space-y-6">

      {/* Alerta de seller criado */}
      {searchParams.created === '1' && searchParams.name && searchParams.pwd && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/25 p-4 space-y-2">
          <p className="text-sm font-semibold text-green-400">
            <span className="text-white">{searchParams.name}</span> criado com sucesso!
          </p>
          <p className="text-xs text-white/50">
            Senha temporária: <code className="font-mono text-white/80 bg-white/10 px-2 py-0.5 rounded">{searchParams.pwd}</code>
            <span className="ml-2 text-white/30">— guarde antes de sair desta página.</span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#888]">
          {sellers?.length ?? 0} {(sellers?.length ?? 0) === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}
        </p>
        <Link
          href="/admin/commercial/team/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#f5d800] shadow-[0_4px_20px_rgba(234,206,0,0.2)] transition-colors text-sm shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Novo
        </Link>
      </div>

      {!sellers?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Users2 className="h-10 w-10 text-white/20" />
          <p className="text-[#888] text-sm">Nenhum vendedor/SDR/closer cadastrado.</p>
          <Link href="/admin/commercial/team/new" className="text-[#EACE00] text-sm hover:underline">
            Adicionar o primeiro
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sellers.map((seller) => {
            const roleConf = ROLE_CONFIG[seller.role] ?? ROLE_CONFIG.vendedor
            const RoleIcon = roleConf.icon
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const activeSellerships = ((seller.client_sellers as any[]) ?? []).filter((cs) => cs.active)

            return (
              <div
                key={seller.id}
                className={cn(
                  'rounded-2xl bg-[#111] border transition-all duration-200',
                  seller.active
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
                          {(seller.full_name ?? seller.email).slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[140px]">
                          {seller.full_name ?? '—'}
                        </h3>
                        <p className="text-xs text-[#888] truncate mt-0.5">{seller.email}</p>
                      </div>
                    </div>
                    <div className={cn('w-2 h-2 rounded-full shrink-0', seller.active ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-white/20')} />
                  </div>

                  {/* Role badge */}
                  <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', roleConf.classes)}>
                    <RoleIcon className="h-3 w-3" />
                    {roleConf.label}
                  </span>

                  {/* Clientes vinculados */}
                  <div className="space-y-1 pt-1 border-t border-[#1a1a1a]">
                    <p className="text-xs text-white/25 mb-1.5">Clientes vinculados</p>
                    {activeSellerships.length === 0 ? (
                      <p className="text-xs text-white/20 italic">Nenhum cliente vinculado</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {activeSellerships.slice(0, 4).map((cs: any) => (
                          <span
                            key={`${cs.client_id}-${cs.seller_role}`}
                            className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50"
                          >
                            {cs.clients?.name ?? '—'}
                          </span>
                        ))}
                        {activeSellerships.length > 4 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">
                            +{activeSellerships.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#1a1a1a]">
                    <Link
                      href={`/admin/commercial/team/${seller.id}`}
                      className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium text-white/50 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Ver detalhes
                    </Link>
                    <Link
                      href={`/admin/commercial/team/${seller.id}/edit`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Editar
                    </Link>
                    <form action={toggleActiveSellerAction}>
                      <input type="hidden" name="seller_id" value={seller.id} />
                      <input type="hidden" name="active" value={(!seller.active).toString()} />
                      <button
                        type="submit"
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          seller.active
                            ? 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        )}
                      >
                        {seller.active ? 'Desativar' : 'Ativar'}
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
  )
}

export const dynamic = 'force-dynamic'
