import { getCommissionDefaults } from '@/lib/app-settings'
import { CommissionDefaultsForm } from './defaults-form'

export default async function CommercialSettingsPage() {
  const defaults = await getCommissionDefaults()

  return (
    <div className="max-w-2xl space-y-6">
      <CommissionDefaultsForm initial={defaults} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
