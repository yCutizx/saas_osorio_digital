'use client'

import { MessageCircle } from 'lucide-react'
import { buildWhatsappLink } from '@/lib/finance'

interface Props {
  clientName:  string
  amount:      number
  dueDate:     string  // dd/MM/yyyy já formatado
  daysOverdue: number
}

export function RegularizeButton({ clientName, amount, dueDate, daysOverdue }: Props) {
  const phone = process.env.NEXT_PUBLIC_RAFAEL_WHATSAPP_NUMBER ?? ''

  function handleClick() {
    if (!phone) {
      // Sem env var configurada: noop silencioso. Cliente vê botão mas não faz nada.
      // Admin precisa configurar NEXT_PUBLIC_RAFAEL_WHATSAPP_NUMBER na Vercel.
      console.warn('NEXT_PUBLIC_RAFAEL_WHATSAPP_NUMBER não configurado')
      return
    }
    const url = buildWhatsappLink({ phone, clientName, amount, dueDate, daysOverdue })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!phone}
      className="inline-flex items-center gap-2 bg-white text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
    >
      <MessageCircle className="h-4 w-4" />
      Quero regularizar
    </button>
  )
}
