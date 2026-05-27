import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { createAdminClient } from '@/lib/supabase/admin'
import { EditSellerForm } from './edit-seller-form'
import type { SellerRole } from '@/types'

interface Props { params: { id: string } }

export default async function EditCommercialSellerPage({ params }: Props) {
  const admin = createAdminClient()

  const { data: seller } = await admin
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', params.id)
    .in('role', ['vendedor', 'sdr', 'closer'])
    .maybeSingle()

  if (!seller) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/admin/commercial/team/${seller.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para detalhes
      </Link>

      <Card className="bg-[#111] border-[#222]">
        <CardContent className="p-6">
          <EditSellerForm
            id={seller.id}
            initialFullName={seller.full_name ?? ''}
            email={seller.email}
            initialRole={seller.role as SellerRole}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export const dynamic = 'force-dynamic'
