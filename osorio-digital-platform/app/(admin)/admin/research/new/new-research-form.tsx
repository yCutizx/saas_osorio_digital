'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createResearchAction, type FormState } from './actions'

type Client = { id: string; name: string }

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
        : <><Send className="h-4 w-4" />Salvar Pesquisa</>}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function NewResearchForm({ clients }: { clients: Client[] }) {
  const [state, action] = useFormState<FormState, FormData>(createResearchAction, {})

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
          placeholder="Nome da pesquisa de mercado"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
        />
        <FieldError messages={state.errors?.title} />
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-white/70 text-sm">
          Descrição <span className="text-white/30 font-normal text-xs">(opcional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Breve descrição do conteúdo da pesquisa..."
          rows={3}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow resize-none"
        />
      </div>

      {/* URL do arquivo */}
      <div className="space-y-1.5">
        <Label htmlFor="file_url" className="text-white/70 text-sm">
          Link do Arquivo (PDF / Google Drive) <span className="text-red-400">*</span>
        </Label>
        <Input
          id="file_url"
          name="file_url"
          type="url"
          placeholder="https://drive.google.com/..."
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
        />
        <FieldError messages={state.errors?.file_url} />
      </div>

      {/* Cliente (opcional) */}
      <div className="space-y-1.5">
        <Label htmlFor="client_id" className="text-white/70 text-sm">
          Cliente <span className="text-white/30 font-normal text-xs">(deixe em branco para todos)</span>
        </Label>
        <select
          id="client_id"
          name="client_id"
          className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-yellow transition-colors"
        >
          <option value="">Todos os clientes Premium</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <FieldError messages={state.errors?.client_id} />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label htmlFor="tags_raw" className="text-white/70 text-sm">
          Tags <span className="text-white/30 font-normal text-xs">(separadas por vírgula)</span>
        </Label>
        <Input
          id="tags_raw"
          name="tags_raw"
          placeholder="e-commerce, comportamento do consumidor"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
        />
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
