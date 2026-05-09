'use client'

import { MessageCircle, Megaphone, Search, Users, Globe, Pencil, AlertCircle } from 'lucide-react'

export type Lead = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  source: string
  estimated_value: number | null
  stage: string
  notes: string | null
  created_at: string
  updated_at: string
  responsible: { id: string; full_name: string } | null
}

interface LeadCardProps {
  lead: Lead
  isOverdue: boolean
  onClick: () => void
}

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  whatsapp:  { icon: <MessageCircle className="h-3 w-3" style={{ color: '#25D366' }} />, label: 'WhatsApp' },
  meta_ads:  { icon: <Megaphone className="h-3 w-3" style={{ color: '#0082FB' }} />, label: 'Meta Ads' },
  google:    { icon: <Search className="h-3 w-3" style={{ color: '#EA4335' }} />, label: 'Google' },
  indicacao: { icon: <Users className="h-3 w-3" style={{ color: '#F59E0B' }} />, label: 'Indicação' },
  site:      { icon: <Globe className="h-3 w-3" style={{ color: '#14B8A6' }} />, label: 'Site' },
  manual:    { icon: <Pencil className="h-3 w-3" style={{ color: '#6B7280' }} />, label: 'Manual' },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function LeadCard({ lead, isOverdue, onClick }: LeadCardProps) {
  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const daysSince = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000)

  const sourceInfo = SOURCE_CONFIG[lead.source] ?? SOURCE_CONFIG.manual

  return (
    <div
      onClick={onClick}
      className="relative bg-[#111] border border-[#222] rounded-xl p-3 hover:border-[#333] cursor-pointer transition-all group"
    >
      {isOverdue && (
        <span className="absolute top-2 right-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        </span>
      )}

      <p className="text-white font-semibold text-sm leading-tight pr-5">{lead.name}</p>
      {lead.company && (
        <p className="text-[#888] text-xs mt-0.5">{lead.company}</p>
      )}

      <p className="text-[#EACE00] text-xs font-semibold mt-2">
        {lead.estimated_value != null ? fmtCurrency(lead.estimated_value) : 'Sem valor'}
      </p>

      <div className="flex items-center gap-1 mt-2">
        {sourceInfo.icon}
        <span className="text-[#666] text-xs">{sourceInfo.label}</span>
      </div>

      <div className="flex items-center justify-between mt-3">
        {lead.responsible ? (
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-[#EACE00] flex items-center justify-center text-black font-bold text-[9px] shrink-0">
              {getInitials(lead.responsible.full_name)}
            </div>
            <span className="text-[#666] text-xs truncate max-w-[80px]">{lead.responsible.full_name.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-[#555] text-xs">Sem resp.</span>
        )}
        <span className="text-[#555] text-[10px]">
          {daysSince === 0 ? 'Hoje' : `${daysSince}d no estágio`}
        </span>
      </div>
    </div>
  )
}
