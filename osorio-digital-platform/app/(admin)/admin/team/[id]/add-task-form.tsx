'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createTaskAction, type TaskFormState } from './actions'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Loader2, Plus } from 'lucide-react'

type Client = { id: string; name: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-yellow text-brand-black font-semibold text-sm hover:bg-brand-yellow/90 transition-colors disabled:opacity-60"
    >
      {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</> : <><Plus className="h-3.5 w-3.5" />Adicionar</>}
    </button>
  )
}

export function AddTaskForm({ assignedTo, clients }: { assignedTo: string; clients: Client[] }) {
  const [state, action] = useFormState<TaskFormState, FormData>(createTaskAction, {})

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="assigned_to" value={assignedTo} />

      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Título */}
      <div className="space-y-1">
        <Label htmlFor="title" className="text-white/60 text-xs">
          Título <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title" name="title"
          placeholder="O que precisa ser feito?"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-brand-yellow h-9 text-sm"
        />
        {state.errors?.title && <p className="text-red-400 text-xs">{state.errors.title[0]}</p>}
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <Label htmlFor="description" className="text-white/60 text-xs">Descrição</Label>
        <Textarea
          id="description" name="description"
          placeholder="Detalhes adicionais..."
          rows={2}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-brand-yellow resize-none text-sm"
        />
      </div>

      {/* Cliente + Prioridade */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="client_id" className="text-white/60 text-xs">Cliente</Label>
          <select
            id="client_id" name="client_id"
            className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-yellow transition-colors"
          >
            <option value="">Geral</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="priority" className="text-white/60 text-xs">Prioridade</Label>
          <select
            id="priority" name="priority"
            defaultValue="media"
            className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-yellow transition-colors"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      {/* Prazo + Horário */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="due_date" className="text-white/60 text-xs">Prazo</Label>
          <Input
            id="due_date" name="due_date"
            type="date"
            className="bg-white/5 border-white/10 text-white focus:border-brand-yellow h-9 text-sm [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="due_time" className="text-white/60 text-xs">Horário</Label>
          <Input
            id="due_time" name="due_time"
            type="time"
            className="bg-white/5 border-white/10 text-white focus:border-brand-yellow h-9 text-sm [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <SubmitButton />
      </div>
    </form>
  )
}
