'use client'

import Link from 'next/link'
import { Mail, TrendingUp, Camera, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
  basico:  { label: 'Básico',   classes: 'bg-white/10 text-white/60 border-white/10' },
  pro:     { label: 'Pro',      classes: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
  premium: { label: 'Premium',  classes: 'bg-brand-yellow/20 text-brand-yellow border-brand-yellow/20' },
}

export function ClientCard({ client }: { client: ClientWithAssignments }) {
  const plan   = PLAN_CONFIG[client.plan] ?? PLAN_CONFIG.basico
  const traffic = client.client_assignments.find((a) => a.role === 'traffic_manager')
  const social  = client.client_assignments.find((a) => a.role === 'social_media')

  return (
    <Card className="bg-card border-border hover:border-white/20 transition-all group">
      <CardContent className="p-5 space-y-4">
        {/* Header do card */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-yellow/20 flex items-center justify-center shrink-0">
              <span className="text-brand-yellow font-bold text-sm">
                {client.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate max-w-[160px]">
                {client.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {client.industry ?? 'Segmento não informado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${plan.classes}`}>
              {plan.label}
            </span>
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${client.active ? 'bg-green-400' : 'bg-white/20'}`}
              title={client.active ? 'Ativo' : 'Inativo'}
            />
          </div>
        </div>

        {/* Equipe responsável */}
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {traffic?.profiles?.full_name ?? <span className="italic">Sem gestor atribuído</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Camera className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {social?.profiles?.full_name ?? <span className="italic">Sem social media atribuído</span>}
            </span>
          </div>
          {client.contact_email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{client.contact_email}</span>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <Link
          href={`/admin/clients/${client.id}`}
          className="flex items-center justify-between w-full pt-1 text-xs text-muted-foreground hover:text-brand-yellow transition-colors group/link"
        >
          <span>Ver detalhes</span>
          <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </CardContent>
    </Card>
  )
}
