import { RecoveryConfirmForm } from './recovery-confirm-form'

interface Props {
  searchParams: { token?: string }
}

export default function RecoveryConfirmPage({ searchParams }: Props) {
  const token = searchParams.token ?? ''

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-white font-semibold">Link inválido</p>
          <a href="/mfa/recovery" className="text-[#EACE00] text-sm hover:underline">
            Solicitar novo link
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-white text-2xl font-bold">Confirmar recuperação</h1>
          <p className="text-[#888] text-sm">
            Ao confirmar, o MFA será removido da sua conta e você será redirecionado
            para configurá-lo novamente.
          </p>
        </div>

        <RecoveryConfirmForm token={token} />
      </div>
    </div>
  )
}
