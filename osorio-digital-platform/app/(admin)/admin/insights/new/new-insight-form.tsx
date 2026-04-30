'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createInsightAction, type FormState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-yellow text-brand-black font-semibold text-sm hover:bg-brand-yellow/90 transition-colors disabled:opacity-60"
    >
      {pending
        ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
        : <><Send className="h-4 w-4" />Salvar Insight</>}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function NewInsightForm() {
  const [state, action] = useFormState<FormState, FormData>(createInsightAction, {})

  return (
    <form action={action} className="space-y-6">
      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-white/70 text-sm">
          Título <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="Título do insight"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
        />
        <FieldError messages={state.errors?.title} />
      </div>

      {/* Conteúdo */}
      <div className="space-y-1.5">
        <Label htmlFor="content" className="text-white/70 text-sm">
          Conteúdo <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="content"
          name="content"
          placeholder="Escreva o insight completo aqui..."
          rows={8}
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow resize-none"
        />
        <FieldError messages={state.errors?.content} />
      </div>

      {/* URL de capa */}
      <div className="space-y-1.5">
        <Label htmlFor="cover_url" className="text-white/70 text-sm">
          URL da Imagem de Capa <span className="text-white/30 font-normal text-xs">(opcional)</span>
        </Label>
        <Input
          id="cover_url"
          name="cover_url"
          type="url"
          placeholder="https://..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
        />
        <FieldError messages={state.errors?.cover_url} />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label htmlFor="tags_raw" className="text-white/70 text-sm">
          Tags <span className="text-white/30 font-normal text-xs">(separadas por vírgula)</span>
        </Label>
        <Input
          id="tags_raw"
          name="tags_raw"
          placeholder="marketing, tráfego pago, tendências"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
        />
      </div>

      {/* Publicar imediatamente */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input type="checkbox" name="published" className="peer sr-only" />
          <div className="w-10 h-6 rounded-full bg-white/10 peer-checked:bg-brand-yellow transition-colors" />
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-white/70 group-hover:text-white transition-colors">
          Publicar imediatamente para os clientes Premium
        </span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
