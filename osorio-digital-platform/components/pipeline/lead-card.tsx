'use client'

import { MessageCircle, Megaphone, Search, Users, Globe, Pencil, AlertCircle, Calendar, Flame, Snowflake, Thermometer } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, getAvatarGradient, getAvatarTextColor } from '@/lib/avatar-utils'
import { cn } from '@/lib/utils'
import { getLeadTemperature, TEMPERATURE_COLOR, TEMPERATURE_LABEL, type Lead, type LeadTemperature } from '@/types'

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
  outro:     { icon: <Pencil className="h-3 w-3" style={{ color: '#6B7280' }} />, label: 'Outro' },
}

const TEMP_ICON: Record<LeadTemperature, React.ReactNode> = {
  frio:  <Snowflake className="h-3 w-3" />,
  morno: <Thermometer className="h-3 w-3" />,
  quente: <Flame className="h-3 w-3" />,
}

export function LeadCard({ lead, isOverdue, onClick }: LeadCardProps) {
  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const daysSince = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000)
  const sourceInfo = SOURCE_CONFIG[lead.source] ?? SOURCE_CONFIG.manual
  const temperature = getLeadTemperature(lead.probability)
  const responsible = lead.responsible ?? null
  const tags = lead.tags ?? []

  const expectedClose = lead.expected_close_date
    ? new Date(lead.expected_close_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-[#111] rounded-xl p-3 cursor-pointer transition-all group border',
        isOverdue
          ? 'border-red-500/50 hover:border-red-500/70 ring-1 ring-red-500/20'
          : 'border-[#222] hover:border-[#333]',
      )}
    >
      {isOverdue && (
        <span
          className="absolute -top-1.5 -right-1.5 z-10 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 ring-2 ring-[#0A0A0A] shadow-lg"
          title="Atividade atrasada"
        >
          <AlertCircle className="h-3 w-3 text-white" />
        </span>
      )}

      <p className="text-white font-semibold text-sm leading-tight pr-5 truncate">{lead.name}</p>
      {(lead.company || lead.role) && (
        <p className="hidden sm:block text-[#888] text-xs mt-0.5 truncate">
          {[lead.role, lead.company].filter(Boolean).join(' · ')}
        </p>
      )}

      {tags.length > 0 && (
        <div className="hidden sm:flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
              style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}40` }}
            >
              {t.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-[#666]">+{tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 gap-2">
        <p className="text-[#EACE00] text-xs font-semibold truncate">
          {lead.estimated_value != null ? fmtCurrency(lead.estimated_value) : 'Sem valor'}
        </p>
        {temperature && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0',
            TEMPERATURE_COLOR[temperature],
          )}>
            {TEMP_ICON[temperature]}
            {TEMPERATURE_LABEL[temperature]}
          </span>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-2 mt-2 text-xs text-[#666]">
        <span className="flex items-center gap-1">
          {sourceInfo.icon}
          <span>{sourceInfo.label}</span>
        </span>
        {expectedClose && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {expectedClose}
          </span>
        )}
      </div>

      <div className="hidden sm:flex items-center justify-between mt-3">
        {responsible ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="size-5 shrink-0">
              <AvatarFallback className={cn(
                'bg-gradient-to-br text-[9px] font-black',
                getAvatarGradient(responsible.id),
                getAvatarTextColor(getAvatarGradient(responsible.id)),
              )}>
                {getInitials(responsible.full_name ?? responsible.email)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[#666] text-xs truncate max-w-[100px]">
              {(responsible.full_name ?? responsible.email ?? '').split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-[#555] text-xs">Sem resp.</span>
        )}
        <span className="text-[#555] text-[10px]">
          {daysSince === 0 ? 'Hoje' : `${daysSince}d`}
        </span>
      </div>
    </div>
  )
}
