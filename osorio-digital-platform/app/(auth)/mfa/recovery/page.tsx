import { RecoveryRequestForm } from './recovery-request-form'

export default function MfaRecoveryPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-white text-2xl font-bold">Recuperar acesso</h1>
          <p className="text-[#888] text-sm">
            Enviaremos um link de recuperação para o e-mail cadastrado na sua conta.
          </p>
        </div>

        <RecoveryRequestForm />

        <p className="text-center text-xs text-[#555]">
          <a href="/mfa/verify" className="text-[#888] hover:underline">
            Voltar para verificação
          </a>
        </p>
      </div>
    </div>
  )
}
