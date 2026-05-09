'use client'

import { useFormState } from 'react-dom'
import { createClientBoardAction } from '../actions'
import { AlertCircle } from 'lucide-react'

export function NewBoardForm() {
  const [state, action] = useFormState<{ error?: string }, FormData>(
    createClientBoardAction,
    {},
  )

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Nome do quadro <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="Ex: Ideias de conteúdo"
          className="w-full h-10 px-3 rounded-lg bg-[#1a1a1a] border border-[#333] text-[#ccc] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#EACE00]/60 transition-colors"
        />
      </div>

      <button
        type="submit"
        className="w-full h-11 rounded-lg bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#EACE00]/90 transition-colors"
      >
        Criar Quadro
      </button>
    </form>
  )
}
