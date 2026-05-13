import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppLayout } from '@/components/layout/app-layout'
import { Plus, GitMerge } from 'lucide-react'

const ALLOWED = ['admin', 'social_media', 'traffic_manager']

export default async function TrafficPipelineIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !ALLOWED.includes(profile.role)) redirect('/traffic/dashboard')

  const { data: memberRows } = await admin.from('pipeline_members').select('pipeline_id').eq('profile_id', user.id)
  const memberIds = (memberRows ?? []).map((m) => m.pipeline_id)

  const orFilter = memberIds.length > 0
    ? `created_by.eq.${user.id},id.in.(${memberIds.join(',')})`
    : `created_by.eq.${user.id}`

  const { data: pipelines } = await admin
    .from('pipelines')
    .select('id, name, description, color, created_at')
    .or(orFilter)
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Pipelines">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-[#EACE00]" />
              Pipelines
            </h1>
            <p className="text-white/40 text-sm mt-0.5">Organize suas vendas em múltiplos funis personalizados.</p>
          </div>
          <Link href="/traffic/pipeline/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors">
            <Plus className="h-4 w-4" />Novo Pipeline
          </Link>
        </div>

        {(pipelines ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[#111] border border-[#222] rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-[#EACE00]/10 border border-[#EACE00]/20 flex items-center justify-center">
              <GitMerge className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold mb-1">Nenhum pipeline ainda</p>
              <p className="text-[#888] text-sm">Crie seu primeiro funil para começar a organizar leads.</p>
            </div>
            <Link href="/traffic/pipeline/new" className="text-[#EACE00] text-sm hover:underline">Criar primeiro pipeline</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelines!.map((p) => (
              <Link key={p.id} href={`/traffic/pipeline/${p.id}`} className="group bg-[#0d0d0d] border border-[#222] rounded-2xl p-5 hover:border-[#333] transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${p.color}22` }}>
                    <GitMerge className="h-5 w-5" style={{ color: p.color }} />
                  </div>
                </div>
                <h2 className="font-semibold text-white text-sm group-hover:text-[#EACE00] transition-colors">{p.name}</h2>
                {p.description && <p className="text-xs text-white/40 mt-1 line-clamp-2">{p.description}</p>}
                <p className="text-[10px] text-white/30 mt-3">Criado em {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
