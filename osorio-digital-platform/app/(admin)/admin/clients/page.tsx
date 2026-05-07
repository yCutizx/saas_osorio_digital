import Link from 'next/link'
import { UserPlus, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { ClientCard } from './client-card'
import { CreatedClientAlert } from './created-client-alert'

async function getClients() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .select(`
      id, name, industry, plan, active, contact_email, created_at,
      client_assignments(
        role,
        profiles(id, full_name)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

interface PageProps {
  searchParams: { created?: string; email?: string; pwd?: string }
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const clients = await getClients()
  const showAlert = searchParams.created === '1'

  return (
    <AppLayout pageTitle="Clientes">
      <div className="space-y-6">

        {/* Alerta de cliente criado */}
        {showAlert && searchParams.email && searchParams.pwd && (
          <CreatedClientAlert
            email={searchParams.email}
            password={searchParams.pwd}
          />
        )}

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[#888] text-sm">
              {clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
            </p>
          </div>
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#f5d800] shadow-[0_4px_20px_rgba(234,206,0,0.2)] transition-colors text-sm shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Novo Cliente
          </Link>
        </div>

        {/* Lista */}
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Nenhum cliente ainda</h3>
            <p className="text-[#888] text-sm mb-6">
              Comece cadastrando o primeiro cliente da agência.
            </p>
            <Link
              href="/admin/clients/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#f5d800] shadow-[0_4px_20px_rgba(234,206,0,0.2)] transition-colors text-sm"
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar Cliente
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* ClientCard espera o tipo com client_assignments aninhado do Supabase */}
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                client={client as any}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
