'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { ReactNode, MouseEvent } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger'

interface Props {
  children: ReactNode
  loadingText?: string
  variant?: Variant
  className?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

const BASE = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[#EACE00] text-black hover:bg-[#f5d800]',
  secondary: 'bg-[#1a1a1a] border border-[#222] text-[#ccc] hover:bg-[#222]',
  danger:    'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20',
}

/**
 * Botão de submit com trava automática de duplo-clique via `useFormStatus`.
 * Deve estar DENTRO de um `<form action={...}>` (não funciona em forms tradicionais com onSubmit).
 */
export function SubmitButton({ children, loadingText = 'Salvando...', variant = 'primary', className, onClick }: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={onClick}
      className={cn(BASE, VARIANTS[variant], className)}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
