import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NewBoardForm } from './new-board-form'

export default async function NewClientBoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') redirect('/client/home')

  const admin = createAdminClient()
  const { count } = await admin
    .from('kanban_boards')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)

  const usedCount = count ?? 0
  const atLimit   = usedCount >= 3

  return (
    <AppLayout pageTitle="Novo Quadro">
      <div className="max-w-md space-y-6">
        <Link
          href="/client/kanban"
          className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div>
          <h1 className="text-xl font-bold text-white">Novo Quadro</h1>
          <p className="text-sm text-white/40 mt-1">
            Você pode criar até 3 quadros próprios ({usedCount}/3 usados).
          </p>
        </div>

        {atLimit ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl px-5 py-4 text-sm">
            Limite de 3 quadros atingido. Delete um quadro existente para criar outro.
          </div>
        ) : (
          <NewBoardForm />
        )}
      </div>
    </AppLayout>
  )
}
