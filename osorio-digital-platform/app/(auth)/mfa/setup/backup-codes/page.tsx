import { BackupCodesView } from './backup-codes-view'

export default function BackupCodesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-white text-2xl font-bold">Códigos de Backup</h1>
          <p className="text-[#888] text-sm">
            Salve estes códigos em um lugar seguro. Cada um pode ser usado apenas uma vez
            se você perder acesso ao seu autenticador.
          </p>
        </div>

        <BackupCodesView />
      </div>
    </div>
  )
}
