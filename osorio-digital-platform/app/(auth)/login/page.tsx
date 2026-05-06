import { Suspense } from 'react'
import { BarChart3, Calendar, Lightbulb, Sparkles, CheckCircle2 } from 'lucide-react'
import LoginForm from './login-form'

export const metadata = {
  title: 'Osorio Digital — Entrar',
  description: 'Métricas de tráfego, calendário editorial, insights e CRM em um único lugar.',
}

const features = [
  { icon: BarChart3,  text: 'Dashboard de tráfego pago em tempo real' },
  { icon: Calendar,   text: 'Calendário editorial com aprovação de clientes' },
  { icon: Lightbulb,  text: 'Insights de mercado e pesquisas exclusivas' },
]

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">

      {/* Glows de fundo */}
      <div className="absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-[#EACE00]/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-[#EACE00]/10 blur-[120px] pointer-events-none" />

      <div className="relative grid min-h-screen lg:grid-cols-2">

        {/* ── LEFT — Branding & pitch ─────────────────────────────── */}
        <section className="flex flex-col justify-between p-8 lg:p-14 xl:p-20">

          {/* Logo */}
          <header className="flex items-center gap-3">
            <div className="relative">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#f5d800] to-[#EACE00] grid place-items-center font-black text-black text-lg shadow-[0_0_20px_rgba(234,206,0,0.35)]">
                O
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-[#EACE00]/25 blur-md -z-10" />
            </div>
            <span className="font-black text-lg tracking-tight text-white">Osorio Digital</span>
          </header>

          {/* Conteúdo central */}
          <div className="max-w-xl py-12 lg:py-0">

            {/* Badge de versão */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222] bg-[#111]/60 backdrop-blur px-3 py-1 text-xs text-[#888] mb-8">
              <Sparkles className="h-3.5 w-3.5 text-[#EACE00]" />
              Plataforma 2026 — nova versão
            </div>

            {/* Título com gradiente */}
            <h1 className="font-black text-5xl lg:text-6xl xl:text-7xl leading-[1.02] tracking-tight text-white">
              Tudo que você precisa para{' '}
              <span className="bg-gradient-to-r from-[#EACE00] to-[#f5d800] bg-clip-text text-transparent">
                escalar.
              </span>
            </h1>

            <p className="mt-6 text-lg text-[#888] max-w-md leading-relaxed">
              Métricas de tráfego, calendário editorial, insights e CRM — tudo em um único lugar.
            </p>

            {/* Features */}
            <ul className="mt-10 space-y-4">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 group">
                  <div className="h-9 w-9 rounded-xl bg-[#EACE00]/10 border border-[#EACE00]/20 grid place-items-center group-hover:bg-[#EACE00]/20 transition-colors shrink-0">
                    <Icon className="h-4 w-4 text-[#EACE00]" />
                  </div>
                  <span className="text-sm text-white/80">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <footer className="text-xs text-[#888]/50">© 2026 Osorio Digital</footer>
        </section>

        {/* ── RIGHT — Auth card ───────────────────────────────────── */}
        <section className="flex items-center justify-center p-6 lg:p-14 relative">

          {/* Linha separadora vertical */}
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#222] to-transparent hidden lg:block" />

          <div className="w-full max-w-md">

            {/* Card */}
            <div className="relative rounded-3xl border border-[#222] bg-[#111]/70 backdrop-blur-xl p-8 lg:p-10 shadow-[0_4px_60px_rgba(0,0,0,0.5)]">

              {/* Linha gradiente no topo do card */}
              <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-[#EACE00]/60 to-transparent" />

              {/* Cabeçalho */}
              <div className="mb-8">
                <h2 className="font-black text-3xl tracking-tight text-white">Bem-vindo de volta</h2>
                <p className="mt-2 text-sm text-[#888]">
                  Entre com suas credenciais para continuar.
                </p>
              </div>

              <Suspense fallback={null}>
                <LoginForm />
              </Suspense>
            </div>

            {/* Badge de segurança */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#888]/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#EACE00]/60" />
              Conexão segura · SSL 256-bit
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
