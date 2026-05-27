import { HandCoins } from 'lucide-react'

export default function CommercialCommissionsPlaceholderPage() {
  return (
    <div className="rounded-2xl bg-[#111] border border-[#222] p-10 text-center space-y-3">
      <HandCoins className="h-8 w-8 text-white/20 mx-auto" />
      <p className="text-white/40 text-sm">Comissões — em breve (Push 2C).</p>
    </div>
  )
}

export const dynamic = 'force-dynamic'
