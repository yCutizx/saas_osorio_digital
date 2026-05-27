import { Settings } from 'lucide-react'

export default function CommercialSettingsPlaceholderPage() {
  return (
    <div className="rounded-2xl bg-[#111] border border-[#222] p-10 text-center space-y-3">
      <Settings className="h-8 w-8 text-white/20 mx-auto" />
      <p className="text-white/40 text-sm">Configurações de comissão — em breve (Push 2D).</p>
    </div>
  )
}

export const dynamic = 'force-dynamic'
