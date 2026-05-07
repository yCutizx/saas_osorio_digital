'use client'

import { useFormState } from 'react-dom'
import { useState } from 'react'
import { createPostAction, type FormState } from './actions'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Send, FileEdit, Eye, X, Image } from 'lucide-react'
import { cn } from '@/lib/utils'

type Client      = { id: string; name: string }
type StaffMember = { id: string; full_name: string | null; email: string }

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { value: 'facebook',  label: 'Facebook',  color: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
  { value: 'linkedin',  label: 'LinkedIn',  color: 'bg-sky-600/20 text-sky-400 border-sky-600/30' },
  { value: 'tiktok',   label: 'TikTok',    color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'twitter',  label: 'Twitter',   color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
]

const MEDIA_TYPES = ['image', 'video', 'carousel', 'reel', 'story']

const SELECT_CLS = 'w-full h-10 px-3 rounded-lg bg-[#1a1a1a] border border-[#333] text-[#ccc] text-sm focus:outline-none focus:border-[#EACE00]/60 transition-colors [color-scheme:dark]'

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

interface Props {
  clients:      Client[]
  staff:        StaffMember[]
  defaultDate?: string
}

export function NewPostForm({ clients, staff, defaultDate }: Props) {
  const [state, action] = useFormState<FormState, FormData>(createPostAction, {})
  const [platforms,   setPlatforms]   = useState<Set<string>>(new Set(['instagram']))
  const [title,       setTitle]       = useState('')
  const [caption,     setCaption]     = useState('')
  const [hashtags,    setHashtags]    = useState('')
  const [mediaType,   setMediaType]   = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const captionLen = caption.length
  const previewHashtags = hashtags
    .split(/[\s,]+/).filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')

  const defaultDatetime = defaultDate ? `${defaultDate}T09:00` : ''

  function togglePlatform(value: string) {
    setPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(value)) { next.delete(value) } else { next.add(value) }
      return next
    })
  }

  return (
    <>
      <form action={action} className="space-y-6">
        {state.message && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.message}
          </div>
        )}

        {/* Cliente */}
        <div className="space-y-1.5">
          <Label htmlFor="client_id" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Cliente <span className="text-red-400">*</span>
          </Label>
          <select id="client_id" name="client_id" required className={SELECT_CLS}>
            <option value="">Selecione um cliente...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <FieldError messages={state.errors?.client_id} />
        </div>

        {/* Título */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Título <span className="text-red-400">*</span>
          </Label>
          <Input
            id="title" name="title"
            placeholder="Título interno do post"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[#1a1a1a] border-[#333] text-[#ccc] placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <FieldError messages={state.errors?.title} />
        </div>

        {/* Plataformas — múltipla seleção */}
        <div className="space-y-1.5">
          <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Plataformas <span className="text-red-400">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label key={p.value} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="platform"
                  value={p.value}
                  checked={platforms.has(p.value)}
                  onChange={() => togglePlatform(p.value)}
                  className="sr-only"
                />
                <span className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  platforms.has(p.value)
                    ? p.color
                    : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                )}>
                  {p.label}
                </span>
              </label>
            ))}
          </div>
          <FieldError messages={state.errors?.platform} />
        </div>

        {/* Tipo de mídia e URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="media_type" className="text-[#888] text-xs font-medium uppercase tracking-wider">Tipo de Mídia</Label>
            <select
              id="media_type" name="media_type"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="">Selecione...</option>
              {MEDIA_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="media_url" className="text-[#888] text-xs font-medium uppercase tracking-wider">URL da Mídia</Label>
            <Input
              id="media_url" name="media_url" type="url" placeholder="https://..."
              className="bg-[#1a1a1a] border-[#333] text-[#ccc] placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
            />
            <FieldError messages={state.errors?.media_url} />
          </div>
        </div>

        {/* Legenda */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="caption" className="text-[#888] text-xs font-medium uppercase tracking-wider">Legenda</Label>
            <span className={cn('text-xs', captionLen > 2000 ? 'text-red-400' : 'text-white/30')}>{captionLen}/2200</span>
          </div>
          <Textarea
            id="caption" name="caption"
            placeholder="Texto do post..."
            rows={5}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="bg-[#1a1a1a] border-[#333] text-[#ccc] placeholder:text-white/30 focus:border-[#EACE00]/60 resize-none"
          />
        </div>

        {/* Observações Internas */}
        <div className="space-y-1.5">
          <Label htmlFor="internal_notes" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Observações Internas
          </Label>
          <Textarea
            id="internal_notes" name="internal_notes"
            placeholder="Anotações para a equipe (não visível para o cliente)"
            rows={3}
            className="bg-[#1a1a1a] border-[#333] text-[#ccc] placeholder:text-white/30 focus:border-[#EACE00]/60 resize-none"
          />
        </div>

        {/* Hashtags */}
        <div className="space-y-1.5">
          <Label htmlFor="hashtags_raw" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Hashtags <span className="text-white/30 font-normal text-xs">(separadas por vírgula ou espaço)</span>
          </Label>
          <Input
            id="hashtags_raw" name="hashtags_raw"
            placeholder="marketing digital, empreendedorismo, vendas"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="bg-[#1a1a1a] border-[#333] text-[#ccc] placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          {previewHashtags && <p className="text-[#EACE00]/70 text-xs">{previewHashtags}</p>}
        </div>

        {/* Responsável */}
        {staff.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="assigned_to" className="text-[#888] text-xs font-medium uppercase tracking-wider">Responsável</Label>
            <select id="assigned_to" name="assigned_to" className={SELECT_CLS}>
              <option value="">Sem responsável</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
              ))}
            </select>
          </div>
        )}

        {/* Data */}
        <div className="space-y-1.5">
          <Label htmlFor="scheduled_at" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Data e Hora de Publicação <span className="text-red-400">*</span>
          </Label>
          <Input
            id="scheduled_at" name="scheduled_at"
            type="datetime-local"
            required
            defaultValue={defaultDatetime}
            className="bg-[#1a1a1a] border-[#333] text-[#ccc] focus:border-[#EACE00]/60 h-10 [color-scheme:dark]"
          />
          <FieldError messages={state.errors?.scheduled_at} />
        </div>

        {/* Botões */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-[#EACE00]/30 text-[#EACE00] hover:bg-[#EACE00]/5 text-sm font-medium transition-colors"
          >
            <Eye className="h-4 w-4" />
            Pré-visualizar
          </button>
          <div className="flex gap-3">
            <input type="hidden" name="status" value="draft" />
            <button
              type="submit"
              onClick={(e) => {
                const form = e.currentTarget.form
                const input = form?.querySelector<HTMLInputElement>('input[name="status"]')
                if (input) input.value = 'draft'
              }}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 hover:text-white text-sm font-medium transition-colors"
            >
              <FileEdit className="h-4 w-4" />
              Salvar Rascunho
            </button>
            <button
              type="submit"
              onClick={(e) => {
                const form = e.currentTarget.closest('form')
                const input = form?.querySelector<HTMLInputElement>('input[name="status"]')
                if (input) input.value = 'pending_approval'
              }}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#EACE00] text-black font-semibold hover:bg-[#EACE00]/90 text-sm transition-colors"
            >
              <Send className="h-4 w-4" />
              Enviar para Aprovação
            </button>
          </div>
        </div>
      </form>

      {/* Preview drawer */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowPreview(false)}>
          <div className="flex-1 bg-black/50 backdrop-blur-sm" />
          <div
            className="w-full max-w-sm h-full bg-[#0A0A0A] border-l border-[#222] overflow-y-auto flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a] shrink-0">
              <h3 className="text-white font-semibold text-sm">Pré-visualização</h3>
              <button onClick={() => setShowPreview(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
                <div className="flex items-center gap-3 p-3 border-b border-[#1a1a1a]">
                  <div className="w-8 h-8 rounded-full bg-[#EACE00]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#EACE00] text-[10px] font-black">OD</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold">Osório Digital</p>
                    <p className="text-white/30 text-[10px] truncate">
                      {Array.from(platforms).map(p => PLATFORMS.find(x => x.value === p)?.label).filter(Boolean).join(', ') || 'Nenhuma plataforma'}
                    </p>
                  </div>
                </div>
                <div className="bg-[#181818] aspect-square flex flex-col items-center justify-center gap-2">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image className="h-10 w-10 text-white/10" aria-hidden="true" />
                  {mediaType && <span className="text-white/20 text-xs capitalize">{mediaType}</span>}
                </div>
                <div className="p-3 space-y-2">
                  {title && <p className="text-white text-xs font-semibold">{title}</p>}
                  {caption && <p className="text-white/70 text-xs leading-relaxed line-clamp-5">{caption}</p>}
                  {previewHashtags && <p className="text-[#EACE00]/60 text-[10px] leading-relaxed">{previewHashtags}</p>}
                  {!title && !caption && !previewHashtags && (
                    <p className="text-white/20 text-xs italic">Preencha o formulário para ver a prévia...</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[#888] text-[10px] uppercase tracking-wider mb-2">Plataformas selecionadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(platforms).length === 0 ? (
                    <span className="text-white/30 text-xs">Nenhuma selecionada</span>
                  ) : (
                    Array.from(platforms).map(p => {
                      const plt = PLATFORMS.find(x => x.value === p)
                      return plt ? (
                        <span key={p} className={cn('text-xs px-2 py-0.5 rounded border', plt.color)}>{plt.label}</span>
                      ) : null
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
