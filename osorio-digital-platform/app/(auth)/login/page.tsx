import { Suspense }   from 'react'
import { Lock }       from 'lucide-react'
import { LeftPanel }  from './left-panel'
import LoginForm      from './login-form'
import { Particles }  from './particles'

export const metadata = {
  title:       'Osorio Digital — Entrar',
  description: 'Métricas de tráfego, calendário editorial, insights e CRM em um único lugar.',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col lg:flex-row overflow-hidden">

      {/* ── Hero — showcase (topo no mobile, esquerda no desktop) ──────── */}
      <div className="login-hero-anim relative w-full h-[65vh] lg:h-screen lg:w-1/2 overflow-hidden shrink-0">

        {/* Slideshow — 3 fotos em loop com crossfade */}
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage:    `url(/images/login-bg-${n}.jpg)`,
              backgroundPosition: n === 3 ? 'right 30% center' : 'center center',
              opacity:            0,
              filter:             'grayscale(100%)',
              animation:          `loginBgSlide 15s linear ${(n - 1) * 5}s infinite both`,
            }}
          />
        ))}

        {/* Grid sutil com pulso */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34,34,34,0.65) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,34,34,0.65) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
            animation:      'loginGridPulse 5s ease-in-out infinite',
          }}
        />

        {/* Gradiente horizontal: esquerda sólida → direita transparente */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/82 to-[#0A0A0A]/15 pointer-events-none" />

        {/* Gradiente vertical: topo e base escuros */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/70 via-transparent to-[#0A0A0A]/80 pointer-events-none" />

        {/* Particles */}
        <Particles />

        {/* Light beams */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-[15%] left-0 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-[#EACE00]/20 to-transparent"
            style={{ animation: 'loginBeam 8s ease-in-out 0s infinite' }}
          />
          <div
            className="absolute top-[52%] left-0 w-[45%] h-[1px] bg-gradient-to-r from-transparent via-[#EACE00]/15 to-transparent"
            style={{ animation: 'loginBeam 11s ease-in-out 3s infinite' }}
          />
          <div
            className="absolute top-[80%] left-0 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-[#EACE00]/12 to-transparent"
            style={{ animation: 'loginBeam 9s ease-in-out 6s infinite' }}
          />
        </div>

        {/* Conteúdo do painel esquerdo (typewriter + cards) */}
        <LeftPanel />
      </div>

      {/* ── Formulário ────────────────────────────────────────────────── */}
      <div className="login-form-anim flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] lg:border-l lg:border-[#181818] px-6 py-6 lg:py-12 relative overflow-hidden">

        {/* Glow amarelo difuso */}
        <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-[#EACE00]/6 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute bottom-[-80px] left-[-40px] w-[300px] h-[300px] bg-[#EACE00]/4 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative w-full max-w-[400px] space-y-6 lg:space-y-8 z-10">

          {/* Logo — apenas no desktop (no mobile já aparece no hero) */}
          <div className="hidden lg:flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src="/images/logo.png"
                alt="Osorio Digital"
                className="h-24 w-auto mx-auto"
                style={{ filter: 'drop-shadow(0 0 20px rgba(234,206,0,0.4))' }}
              />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-white tracking-tight">Bem-vindo de volta</h2>
              <p className="text-sm text-[#666] mt-1.5">Entre com suas credenciais para continuar</p>
            </div>
          </div>

          {/* Título — apenas no mobile (no desktop fica dentro do bloco da logo acima) */}
          <div className="lg:hidden text-center">
            <h2 className="text-2xl font-black text-white tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-[#666] mt-1.5">Entre com suas credenciais para continuar</p>
          </div>

          {/* Formulário */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          {/* Badge de segurança */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#3a3a3a]">
            <Lock className="h-3 w-3" />
            Conexão segura · SSL 256-bit
          </div>
        </div>
      </div>
    </main>
  )
}
