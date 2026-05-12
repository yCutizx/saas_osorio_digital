import { BackupForm } from './backup-form'

export default function MfaBackupPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-white text-2xl font-bold">Código de backup</h1>
          <p className="text-[#888] text-sm">
            Insira um dos seus códigos de backup no formato XXXX-XXXX.
          </p>
        </div>

        <BackupForm />

        <p className="text-center text-xs text-[#555]">
          <a href="/mfa/verify" className="text-[#888] hover:underline">
            Voltar para o autenticador
          </a>
          {' · '}
          <a href="/mfa/recovery" className="text-[#EACE00] hover:underline">
            Recuperação por e-mail
          </a>
        </p>
      </div>
    </div>
  )
}
