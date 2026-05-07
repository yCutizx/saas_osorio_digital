'use client'

import { useFormState } from 'react-dom'
import { useState } from 'react'
import { createCustomPostAction, type FormState } from './actions'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Send, FileEdit } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { value: 'facebook',  label: 'Facebook',  color: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
  { value: 'linkedin',  label: 'LinkedIn',  color: 'bg-sky-600/20 text-sky-400 border-sky-600/30' },
  { value: 'tiktok',   label: 'TikTok',    color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'twitter',  label: 'Twitter',   color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
]

const MEDIA_TYPES = ['image', 'video', 'carousel', 'reel', 'story']

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

interface Props {
  calendarId:  string
  defaultDate?: string
}

export function NewCustomPostForm({ calendarId, defaultDate }: Props) {
  const [state, action] = useFormState<FormState, FormData>(createCustomPostAction, {})
  const [platform, setPlatform] = useState('instagram')
  const [caption, setCaption]   = useState('')
  const [hashtags, setHashtags] = useState('')

  const captionLen = caption.length
  const previewHashtags = hashtags
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .join(' ')

  // Build default datetime-local value from date param
  const defaultDatetime = defaultDate ? `${defaultDate}T09:00` : ''

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="calendar_id" value={calendarId} />

      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Título <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title" name="title"
          placeholder="Título interno do post"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
        />
        <FieldError messages={state.errors?.title} />
      </div>

      {/* Plataforma */}
      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Plataforma <span className="text-red-400">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <label key={p.value} className="cursor-pointer">
              <input type="radio" name="platform" value={p.value}
                checked={platform === p.value} onChange={() => setPlatform(p.value)} className="sr-only" />
              <span className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                platform === p.value ? p.color : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
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
          <select id="media_type" name="media_type"
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#EACE00]/60 transition-colors">
            <option value="">Selecione...</option>
            {MEDIA_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="media_url" className="text-[#888] text-xs font-medium uppercase tracking-wider">URL da Mídia</Label>
          <Input id="media_url" name="media_url" type="url" placeholder="https://..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10" />
          <FieldError messages={state.errors?.media_url} />
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="caption" className="text-[#888] text-xs font-medium uppercase tracking-wider">Caption</Label>
          <span className={cn('text-xs', captionLen > 2000 ? 'text-red-400' : 'text-white/30')}>{captionLen}/2200</span>
        </div>
        <Textarea id="caption" name="caption" placeholder="Texto do post..." rows={5}
          value={caption} onChange={(e) => setCaption(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 resize-none" />
      </div>

      {/* Hashtags */}
      <div className="space-y-1.5">
        <Label htmlFor="hashtags_raw" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Hashtags <span className="text-white/30 font-normal text-xs">(separadas por vírgula ou espaço)</span>
        </Label>
        <Input id="hashtags_raw" name="hashtags_raw"
          placeholder="marketing digital, empreendedorismo, vendas"
          value={hashtags} onChange={(e) => setHashtags(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10" />
        {previewHashtags && <p className="text-[#EACE00]/70 text-xs">{previewHashtags}</p>}
      </div>

      {/* Data */}
      <div className="space-y-1.5">
        <Label htmlFor="scheduled_at" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Data e Hora de Publicação <span className="text-red-400">*</span>
        </Label>
        <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required
          defaultValue={defaultDatetime}
          className="bg-white/5 border-white/10 text-white focus:border-[#EACE00]/60 h-10 [color-scheme:dark]" />
        <FieldError messages={state.errors?.scheduled_at} />
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <input type="hidden" name="status" value="draft" />
        <button type="submit"
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
        <button type="submit"
          onClick={(e) => {
            const form = e.currentTarget.closest('form')
            const input = form?.querySelector<HTMLInputElement>('input[name="status"]')
            if (input) input.value = 'pending_approval'
          }}
          className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#EACE00] text-black font-semibold hover:bg-[#EACE00]/90 text-sm transition-colors"
        >
          <Send className="h-4 w-4" />
          Enviar para Revisão
        </button>
      </div>
    </form>
  )
}
