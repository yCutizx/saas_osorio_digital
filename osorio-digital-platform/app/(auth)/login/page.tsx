import { Suspense } from 'react'
import Image from 'next/image'
import { Lock } from 'lucide-react'
import LoginForm from './login-form'

export const metadata = {
  title:       'Osorio Digital — Entrar',
  description: 'Métricas de tráfego, calendário editorial, insights e CRM em um único lugar.',
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#0A0A0A] px-6 py-12 overflow-hidden">

      {/* Glow amarelo discreto no topo — única decoração */}
      <div
        aria-hidden
        className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#EACE00]/8 blur-[140px] rounded-full pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">

        {/* Logo */}
        <Image
          src="/images/logo.png"
          alt="Osório Digital"
          width={320}
          height={160}
          priority
          className="h-24 md:h-40 w-auto mb-6 md:mb-8"
        />

        {/* Frase única */}
        <p className="text-[#888] text-sm md:text-base text-center mb-8 md:mb-10">
          A plataforma que organiza sua agência
        </p>

        {/* Formulário (reusa o componente existente sem alteração) */}
        <div className="w-full">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer SSL */}
        <div className="mt-8 flex items-center gap-2 text-xs text-[#888]">
          <Lock className="h-3 w-3" />
          Conexão segura · SSL 256-bit
        </div>
      </div>
    </main>
  )
}
