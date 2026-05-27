import { Users2 } from 'lucide-react'

export default function CommercialTeamPlaceholderPage() {
  return (
    <div className="rounded-2xl bg-[#111] border border-[#222] p-10 text-center space-y-3">
      <Users2 className="h-8 w-8 text-white/20 mx-auto" />
      <p className="text-white/40 text-sm">Time comercial — em breve (Push 2B).</p>
    </div>
  )
}

export const dynamic = 'force-dynamic'
