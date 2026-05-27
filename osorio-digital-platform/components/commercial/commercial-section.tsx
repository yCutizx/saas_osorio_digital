import { Briefcase } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCommissionDefaults } from '@/lib/app-settings'
import { CommercialSectionForm } from './commercial-section-form'
import type { ClientSeller, CommissionRule } from '@/types'

interface Props {
  clientId: string
}

export async function CommercialSection({ clientId }: Props) {
  const admin = createAdminClient()

  const [
    defaults,
    { data: rawSellerships },
    { data: profiles },
  ] = await Promise.all([
    getCommissionDefaults(),
    admin
      .from('client_sellers')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true),
    admin
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['vendedor', 'sdr', 'closer'])
      .eq('active', true)
      .order('full_name'),
  ])

  const sellerships = (rawSellerships ?? []) as ClientSeller[]
  const allProfiles = (profiles ?? []) as { id: string; full_name: string | null; email: string; role: string }[]

  const currentSdr      = sellerships.find((s) => s.seller_role === 'sdr')
  const currentCloser   = sellerships.find((s) => s.seller_role === 'closer')
  const currentVendedor = sellerships.find((s) => s.seller_role === 'vendedor')

  // Regra custom do cliente = primeira custom_rule não-nula entre vínculos ativos
  const customRow      = sellerships.find((s) => s.custom_rule)
  const customRule     = (customRow?.custom_rule ?? null) as CommissionRule | null

  return (
    <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-[#EACE00]" />
        <h3 className="text-sm font-semibold text-[#F5F5F0]">Comercial</h3>
      </div>

      <p className="text-xs text-[#888]">
        Vincule um Vendedor único OU um par SDR + Closer. A regra de comissão pode
        ser herdada dos defaults globais ou customizada por cliente.
      </p>

      <CommercialSectionForm
        clientId={clientId}
        profiles={allProfiles}
        defaults={defaults}
        initialSdrId={currentSdr?.user_id ?? null}
        initialCloserId={currentCloser?.user_id ?? null}
        initialVendedorId={currentVendedor?.user_id ?? null}
        initialCustomRule={customRule}
      />
    </section>
  )
}
