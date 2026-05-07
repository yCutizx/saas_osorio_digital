'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateInsightAction, type FormState } from './actions'

type Props = {
  insight: {
    id: string
    title: string
    content: string
    cover_url: string | null
    tags: string[] | null
    published: boolean
  }
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#EACE00]/90 transition-colors disabled:opacity-60"
    >
      {pending
        ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
        : <><Send className="h-4 w-4" />Salvar Alterações</>}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function EditInsightForm({ insight }: Props) {
  const [state, action] = useFormState<FormState, FormData>(updateInsightAction, {})

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={insight.id} />

      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Título <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          defaultValue={insight.title}
          placeholder="Título do insight"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
        />
        <FieldError messages={state.errors?.title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Conteúdo <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={insight.content}
          placeholder="Escreva o insight completo aqui..."
          rows={8}
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 resize-none"
        />
        <FieldError messages={state.errors?.content} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cover_url" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          URL da Imagem de Capa <span className="text-white/30 font-normal text-xs">(opcional)</span>
        </Label>
        <Input
          id="cover_url"
          name="cover_url"
          type="url"
          defaultValue={insight.cover_url ?? ''}
          placeholder="https://..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
        />
        <FieldError messages={state.errors?.cover_url} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tags_raw" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Tags <span className="text-white/30 font-normal text-xs">(separadas por vírgula)</span>
        </Label>
        <Input
          id="tags_raw"
          name="tags_raw"
          defaultValue={(insight.tags ?? []).join(', ')}
          placeholder="marketing, tráfego pago, tendências"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            name="published"
            defaultChecked={insight.published}
            className="peer sr-only"
          />
          <div className="w-10 h-6 rounded-full bg-white/10 peer-checked:bg-[#EACE00] transition-colors" />
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-white/70 group-hover:text-white transition-colors">
          Publicar para clientes Premium
        </span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
