import { redirect }     from 'next/navigation'
import { getMfaStatus } from '@/lib/mfa-status'
import { VerifyForm }   from './verify-form'

export default async function MfaVerifyPage() {
  const { isEnabled, isVerified } = await getMfaStatus()
  if (!isEnabled) redirect('/mfa/setup')
  if (isVerified) redirect('/')

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-white text-2xl font-bold">Verificação em 2 etapas</h1>
          <p className="text-[#888] text-sm">
            Abra seu app autenticador e insira o código de 6 dígitos.
          </p>
        </div>

        <VerifyForm />

        <p className="text-center text-xs text-[#555]">
          Perdeu o acesso ao autenticador?{' '}
          <a href="/mfa/backup" className="text-[#EACE00] hover:underline">
            Usar código de backup
          </a>
          {' · '}
          <a href="/mfa/recovery" className="text-[#888] hover:underline">
            Recuperação por e-mail
          </a>
        </p>
      </div>
    </div>
  )
}
