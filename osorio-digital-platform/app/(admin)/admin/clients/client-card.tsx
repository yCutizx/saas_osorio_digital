'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail, TrendingUp, Camera, ArrowRight, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { deleteClientAction } from './actions'

type Assignment = {
  role: string
  profiles: { id: string; full_name: string | null } | null
}

type ClientWithAssignments = {
  id: string
  name: string
  industry: string | null
  plan: string
  active: boolean
  contact_email: string | null
  created_at: string
  client_assignments: Assignment[]
}

const PLAN_CONFIG: Record<string, { label: string; classes: string }> = {
  basico:  { label: 'Básico',  classes: 'bg-white/8 text-white/50 border-white/10' },
  pro:     { label: 'Pro',     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  premium: { label: 'Premium', classes: 'bg-[#EACE00]/15 text-[#EACE00] border-[#EACE00]/25' },
}

function DeleteModal({
  clientName,
  clientId,
  onCancel,
}: {
  clientName: string
  clientId: string
  onCancel: () => void
}) {
  const [pending, setPending] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#111] border border-[#333] p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Excluir cliente</h3>
            <p className="text-white/40 text-xs">Esta ação não pode ser desfeita</p>
          </div>
        </div>

        <p className="text-sm text-white/70 mb-6 leading-relaxed">
          Tem certeza que deseja excluir <span className="text-white font-semibold">{clientName}</span>?
          Todos os dados, relatórios e o acesso do cliente serão removidos permanentemente.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 h-10 rounded-lg border border-white/10 bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <form
            action={deleteClientAction}
            onSubmit={() => setPending(true)}
            className="flex-1"
          >
            <input type="hidden" name="client_id" value={clientId} />
            <button
              type="submit"
              disabled={pending}
              className="w-full h-10 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Excluindo...</>
                : 'Excluir'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export function ClientCard({ client }: { client: ClientWithAssignments }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const plan    = PLAN_CONFIG[client.plan] ?? PLAN_CONFIG.basico
  const traffic = client.client_assignments.find((a) => a.role === 'traffic_manager')
  const social  = client.client_assignments.find((a) => a.role === 'social_media')

  return (
    <>
      {showDeleteModal && (
        <DeleteModal
          clientName={client.name}
          clientId={client.id}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div className="rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/40 hover:shadow-[0_0_20px_rgba(234,206,0,0.05)] transition-all duration-200 group">
        <div className="p-5 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#EACE00]/15 border border-[#EACE00]/25 flex items-center justify-center shrink-0">
                <span className="text-[#EACE00] font-bold text-sm">
                  {client.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[150px]">
                  {client.name}
                </h3>
                <p className="text-xs text-[#888] truncate mt-0.5">
                  {client.industry ?? 'Segmento não informado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${plan.classes}`}>
                {plan.label}
              </span>
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${client.active ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-white/20'}`}
                title={client.active ? 'Ativo' : 'Inativo'}
              />
            </div>
          </div>

          {/* Equipe responsável */}
          <div className="space-y-2 pt-3 border-t border-[#1a1a1a]">
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <TrendingUp className="h-3 w-3 shrink-0 text-white/25" />
              <span className="truncate">
                {traffic?.profiles?.full_name ?? <span className="italic text-white/20">Sem gestor atribuído</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <Camera className="h-3 w-3 shrink-0 text-white/25" />
              <span className="truncate">
                {social?.profiles?.full_name ?? <span className="italic text-white/20">Sem social media atribuído</span>}
              </span>
            </div>
            {client.contact_email && (
              <div className="flex items-center gap-2 text-xs text-[#888]">
                <Mail className="h-3 w-3 shrink-0 text-white/25" />
                <span className="truncate">{client.contact_email}</span>
              </div>
            )}
          </div>

          {/* Rodapé com ações */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#1a1a1a]">
            <Link
              href={`/admin/clients/${client.id}`}
              className="flex-1 flex items-center justify-between text-xs text-white/30 hover:text-[#EACE00] transition-colors"
            >
              <span>Ver detalhes</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/admin/clients/${client.id}/edit`}
                title="Editar"
                className="p-1.5 rounded-lg text-white/25 hover:bg-white/8 hover:text-white/70 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                title="Excluir"
                onClick={() => setShowDeleteModal(true)}
                className="p-1.5 rounded-lg text-white/25 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
