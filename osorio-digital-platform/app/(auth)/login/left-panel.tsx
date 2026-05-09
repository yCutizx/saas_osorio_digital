'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, CalendarDays, Target } from 'lucide-react'

const WORDS = ['Escalar.', 'Converter.', 'Crescer.', 'Dominar.']

const CARDS = [
  { icon: TrendingUp,   metric: 'ROAS 4.2x',           sub: '↑ 23% este mês',          color: '#22C55E', delay: '0.7s' },
  { icon: CalendarDays, metric: '12 posts aprovados',   sub: 'esta semana',              color: '#3B82F6', delay: '0.95s' },
  { icon: Target,       metric: 'CPL R$ 8,50',          sub: '↓ 18% vs mês anterior',   color: '#EACE00', delay: '1.2s' },
]

export function LeftPanel() {
  const [idx,  setIdx]  = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false)
      const t = setTimeout(() => {
        setIdx(i => (i + 1) % WORDS.length)
        setShow(true)
      }, 380)
      return () => clearTimeout(t)
    }, 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative h-full flex flex-col justify-between p-10 xl:p-16 z-10">

      {/* Logo */}
      <header
        className="flex items-center gap-3"
        style={{ animation: 'loginSlideLeft 0.5s ease-out 0.3s both' }}
      >
        <div className="h-10 w-10 rounded-xl bg-[#EACE00] grid place-items-center font-black text-black text-lg leading-none shadow-[0_0_18px_rgba(234,206,0,0.35)]">
          O
        </div>
        <span className="font-black text-white tracking-tight">Osorio Digital</span>
      </header>

      {/* Center — headline + cards */}
      <div style={{ animation: 'loginSlideLeft 0.6s ease-out 0.5s both' }}>

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EACE00]/55 mb-5">
          A plataforma completa da Osorio Digital
        </p>

        {/* Typewriter headline */}
        <h1 className="font-black text-5xl xl:text-[3.6rem] text-white leading-[1.06] tracking-tight">
          A hora de
          <br />
          <span
            className="text-[#EACE00] inline-block"
            style={{
              transition:  'opacity 0.38s ease, transform 0.38s ease',
              opacity:     show ? 1 : 0,
              transform:   show ? 'translateY(0)' : 'translateY(10px)',
              animation:   show ? 'loginTypewriterGlow 2s ease-in-out infinite alternate' : undefined,
            }}
          >
            {WORDS[idx]}
          </span>
        </h1>

        <p className="mt-5 text-[#777] text-base leading-relaxed max-w-[280px]">
          Métricas de tráfego, calendário editorial, insights e CRM em um único lugar.
        </p>

        {/* Floating metric cards */}
        <div className="mt-8 space-y-3">
          {CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.metric}
                className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] px-4 py-3 w-fit"
                style={{
                  background:       'rgba(13,13,13,0.92)',
                  backdropFilter:   'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  animation: `loginCardIn 0.5s ease-out ${card.delay} both, loginFloat 3.6s ease-in-out ${card.delay} infinite`,
                }}
              >
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ background: card.color + '22' }}
                >
                  <Icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{card.metric}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: card.color + 'bb' }}>
                    {card.sub}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer metrics */}
      <footer
        className="flex items-center gap-3 text-xs text-[#555]"
        style={{ animation: 'loginSlideLeft 0.5s ease-out 1s both' }}
      >
        <span>+100 clientes</span>
        <span className="text-[#2a2a2a]">·</span>
        <span>+5 anos</span>
        <span className="text-[#2a2a2a]">·</span>
        <span>R$1MM+ gerenciado</span>
      </footer>
    </div>
  )
}
