import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Pencil, HandCoins, Phone, Handshake, Users2, Receipt } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/finance'
import { formatCommissionStatus, getCommissionStatusColor, getSellerRoleLabel } from '@/lib/commissions'
import type { SellerRole } from '@/types'

const ROLE_CONFIG: Record<string, { icon: React.ElementType; classes: string }> = {
  vendedor: { icon: HandCoins, classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  sdr:      { icon: Phone,     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  closer:   { icon: Handshake, classes: 'bg-green-500/15 text-green-400 border-green-500/25' },
}

interface Props { params: { id: string } }

export default async function CommercialSellerDetailPage({ params }: Props) {
  const admin = createAdminClient()

  const { data: seller } = await admin
    .from('profiles')
    .select('id, full_name, email, role, active, created_at')
    .eq('id', params.id)
    .in('role', ['vendedor', 'sdr', 'closer'])
    .maybeSingle()

  if (!seller) notFound()

  const [{ data: sellerships }, { data: commissions }] = await Promise.all([
    admin
      .from('client_sellers')
      .select('id, seller_role, active, assigned_at, deactivated_at, clients(id, name)')
      .eq('user_id', params.id)
      .order('assigned_at', { ascending: false }),
    admin
      .from('commission_invoices_with_meta')
      .select('id, client_name, source_seller_role, source_month_index, commission_amount, status, paid_at, reference_month, created_at')
      .eq('seller_user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const activeSellerships = (sellerships ?? []).filter((s) => s.active)
  const roleConf = ROLE_CONFIG[seller.role] ?? ROLE_CONFIG.vendedor
  const RoleIcon = roleConf.icon

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/commercial/team"
        className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Time
      </Link>

      {/* Header card */}
      <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#EACE00]/10 border border-[#EACE00]/20 flex items-center justify-center shrink-0">
              <span className="text-[#EACE00] font-bold">
                {(seller.full_name ?? seller.email).slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{seller.full_name ?? '—'}</h2>
              <p className="text-sm text-[#888] truncate">{seller.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', roleConf.classes)}>
                  <RoleIcon className="h-3 w-3" />
                  {getSellerRoleLabel(seller.role as SellerRole)}
                </span>
                <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border', seller.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-white/40 border-white/10')}>
                  {seller.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/admin/commercial/team/${seller.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Link>
        </div>
      </div>

      {/* Clientes vinculados */}
      <div className="rounded-2xl bg-[#111] border border-[#222] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users2 className="h-4 w-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Clientes vinculados</h3>
          <span className="text-xs text-white/30">({activeSellerships.length})</span>
        </div>
        {activeSellerships.length === 0 ? (
          <p className="text-sm text-white/30 italic">Nenhum cliente vinculado. Vincule pela aba Comercial do cliente.</p>
        ) : (
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {activeSellerships.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                <span className="text-sm text-white truncate">{s.clients?.name ?? '—'}</span>
                <span className="text-xs text-white/40 uppercase tracking-wider">{getSellerRoleLabel(s.seller_role)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de comissões */}
      <div className="rounded-2xl bg-[#111] border border-[#222] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Últimas comissões</h3>
        </div>
        {!commissions || commissions.length === 0 ? (
          <p className="text-sm text-white/30 italic">Nenhuma comissão registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {commissions.map((c) => {
              const refLabel = format(parseISO(c.reference_month), 'MM/yyyy', { locale: ptBR })
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{c.client_name}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      Ref. {refLabel} · mês {c.source_month_index} · {getSellerRoleLabel(c.source_seller_role as SellerRole)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-white tabular-nums">{formatBRL(Number(c.commission_amount))}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', getCommissionStatusColor(c.status))}>
                      {formatCommissionStatus(c.status)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
