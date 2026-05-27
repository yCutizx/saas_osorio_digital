import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { NewSellerForm } from './new-seller-form'

export default function NewCommercialSellerPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/commercial/team"
        className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Time
      </Link>

      <Card className="bg-[#111] border-[#222]">
        <CardContent className="p-6">
          <NewSellerForm />
        </CardContent>
      </Card>
    </div>
  )
}

export const dynamic = 'force-dynamic'
