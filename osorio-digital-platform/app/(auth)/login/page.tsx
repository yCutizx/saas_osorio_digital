import { Suspense } from 'react'
import LoginForm from './login-form'

export const metadata = {
  title: 'Login — Osorio Digital',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">

      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 bg-[#0A0A0A] border-r border-[#222]">
        {/* Glow amarelo no canto superior */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#EACE00]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EACE00] rounded-xl flex items-center justify-center">
              <span className="text-black font-black text-lg">O</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Osorio Digital</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="font-bold text-6xl text-white leading-[1.1] tracking-tight">
              Tudo que você<br />precisa para<br />
              <span className="text-[#EACE00]">escalar.</span>
            </h1>
            <p className="text-white/40 text-lg max-w-sm leading-relaxed">
              Métricas de tráfego, calendário editorial, insights e CRM — tudo em um único lugar.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {[
              'Dashboard de tráfego pago em tempo real',
              'Calendário editorial com aprovação de clientes',
              'Insights de mercado e pesquisas exclusivas',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#EACE00]/20 border border-[#EACE00]/40 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EACE00]" />
                </div>
                <span className="text-white/60 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/20 text-sm">© 2026 Osorio Digital</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0A0A0A]">
        {/* Glow amarelo sutil no canto inferior direito */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#EACE00]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-9 h-9 bg-[#EACE00] rounded-xl flex items-center justify-center">
              <span className="text-black font-black text-base">O</span>
            </div>
            <span className="text-white font-bold text-lg">Osorio Digital</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Bem-vindo de volta</h2>
            <p className="text-white/40">Entre com suas credenciais para continuar.</p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
