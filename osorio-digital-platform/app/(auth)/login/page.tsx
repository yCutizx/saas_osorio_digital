import { Suspense } from 'react'
import LoginForm from './login-form'

export const metadata = {
  title: 'Login — Osorio Digital',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-brand-black flex">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#0f0f0f] border-r border-white/5">
        <div>
          <span className="font-display text-3xl text-brand-yellow tracking-tight">
            Osorio Digital
          </span>
        </div>
        <div className="space-y-6">
          <h1 className="font-display text-5xl text-white leading-tight">
            Tudo que você<br />precisa para escalar<br />
            <span className="text-brand-yellow">seus clientes.</span>
          </h1>
          <p className="text-white/50 text-lg max-w-md">
            Métricas de tráfego pago, calendário editorial, insights e CRM — tudo em um único lugar.
          </p>
        </div>
        <div className="flex gap-8 text-white/30 text-sm">
          <span>© 2026 Osorio Digital</span>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden text-center">
            <span className="font-display text-3xl text-brand-yellow">
              Osorio Digital
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Bem-vindo de volta</h2>
            <p className="text-white/50">Entre com suas credenciais para continuar.</p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
