import { redirect }   from 'next/navigation'
import { setupMfa }   from '@/app/(auth)/mfa/actions'
import { SetupForm }  from './setup-form'
import { getMfaStatus } from '@/lib/mfa-status'

export default async function MfaSetupPage() {
  const { isEnabled } = await getMfaStatus()
  if (isEnabled) redirect('/mfa/verify')

  const setupData = await setupMfa().catch(() => null)
  if (!setupData) redirect('/login?error=mfa_setup_failed')

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-white text-2xl font-bold">Configurar MFA</h1>
          <p className="text-[#888] text-sm">
            Escaneie o QR Code com seu app autenticador (Google Authenticator, Authy, etc.)
          </p>
        </div>

        <SetupForm
          qrCodeDataUrl={setupData.qrCodeDataUrl}
          manualEntryKey={setupData.manualEntryKey}
        />
      </div>
    </div>
  )
}
