'use client'

import Link from 'next/link'
import { Mail, TrendingUp, Camera, ArrowRight } from 'lucide-react'

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

export function ClientCard({ client }: { client: ClientWithAssignments }) {
  const plan    = PLAN_CONFIG[client.plan] ?? PLAN_CONFIG.basico
  const traffic = client.client_assignments.find((a) => a.role === 'traffic_manager')
  const social  = client.client_assignments.find((a) => a.role === 'social_media')

  return (
    <div className="rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/40 hover:shadow-[0_0_20px_rgba(234,206,0,0.05)] transition-all duration-200 group">
      <div className="p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Avatar circular */}
            <div className="w-11 h-11 rounded-full bg-[#EACE00]/15 border border-[#EACE00]/25 flex items-center justify-center shrink-0">
              <span className="text-[#EACE00] font-bold text-sm">
                {client.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[150px]">
                {client.name}
              </h3>
              <p className="text-xs text-white/35 truncate mt-0.5">
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
          <div className="flex items-center gap-2 text-xs text-white/35">
            <TrendingUp className="h-3 w-3 shrink-0 text-white/25" />
            <span className="truncate">
              {traffic?.profiles?.full_name ?? <span className="italic text-white/20">Sem gestor atribuído</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/35">
            <Camera className="h-3 w-3 shrink-0 text-white/25" />
            <span className="truncate">
              {social?.profiles?.full_name ?? <span className="italic text-white/20">Sem social media atribuído</span>}
            </span>
          </div>
          {client.contact_email && (
            <div className="flex items-center gap-2 text-xs text-white/35">
              <Mail className="h-3 w-3 shrink-0 text-white/25" />
              <span className="truncate">{client.contact_email}</span>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <Link
          href={`/admin/clients/${client.id}`}
          className="flex items-center justify-between w-full pt-3 border-t border-[#1a1a1a] text-xs text-white/30 hover:text-[#EACE00] transition-colors"
        >
          <span>Ver detalhes</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
