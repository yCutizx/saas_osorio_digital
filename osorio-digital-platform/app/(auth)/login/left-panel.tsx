'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, CalendarDays, Target } from 'lucide-react'

const WORDS = ['Escalar.', 'Converter.', 'Crescer.', 'Dominar.']

const CARDS = [
  { icon: TrendingUp,   metric: 'ROAS 4.2x',           sub: '↑ 23% este mês',          color: '#22C55E', delay: '0.7s' },
  { icon: CalendarDays, metric: '12 posts aprovados',   sub: 'esta semana',              color: '#3B82F6', delay: '0.95s' },
  { icon: Target,       metric: 'CPL R$ 8,50',          sub: '↓ 18% vs mês anterior',   color: '#EACE00', delay: '1.2s' },
]

const TICKER_ITEMS = [
  '+100 clientes satisfeitos',
  '+R$15MM em vendas geradas',
  '+5 anos de experiência',
  '+R$700K investidos em tráfego',
  'ROI médio 6x',
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
    <div className="relative h-full flex flex-col justify-between p-6 lg:p-10 xl:p-16 z-10">

      {/* Logo */}
      <header
        className="flex items-center"
        style={{ animation: 'loginSlideLeft 0.5s ease-out 0.3s both' }}
      >
        <img src="/images/logo.png" alt="Osorio Digital" className="h-12 lg:h-14 w-auto" />
      </header>

      {/* Center — headline + ticker + cards */}
      <div style={{ animation: 'loginSlideLeft 0.6s ease-out 0.5s both' }}>

        {/* Label — escondido no mobile */}
        <p className="hidden lg:block text-[11px] font-bold uppercase tracking-[0.2em] text-[#EACE00]/55 mb-5">
          A plataforma completa da Osorio Digital
        </p>

        {/* Typewriter headline */}
        <h1 className="font-black text-4xl lg:text-5xl xl:text-[3.6rem] text-white leading-[1.06] tracking-tight">
          A hora de
          <br />
          <span
            className="text-[#EACE00] inline-block"
            style={{
              transition: 'opacity 0.38s ease, transform 0.38s ease',
              opacity:    show ? 1 : 0,
              transform:  show ? 'translateY(0)' : 'translateY(10px)',
              animation:  show ? 'loginTypewriterGlow 2s ease-in-out infinite alternate' : undefined,
            }}
          >
            {WORDS[idx]}
          </span>
        </h1>

        {/* Subtítulo — escondido no mobile */}
        <p className="hidden lg:block mt-5 text-[#777] text-base leading-relaxed max-w-[280px]">
          Métricas de tráfego, calendário editorial, insights e CRM em um único lugar.
        </p>

        {/* Floating metric cards */}
        <div className="mt-4 lg:mt-8 space-y-2 lg:space-y-3">
          {CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.metric}
                className="flex items-center gap-2 lg:gap-3 rounded-xl border border-[#2a2a2a] px-3 py-2 lg:px-4 lg:py-3 w-fit"
                style={{
                  background:           'rgba(13,13,13,0.92)',
                  backdropFilter:       'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  animation: `loginCardIn 0.5s ease-out ${card.delay} both, loginFloat 3.6s ease-in-out ${card.delay} infinite`,
                }}
              >
                <div
                  className="p-1.5 lg:p-2 rounded-lg shrink-0"
                  style={{ background: card.color + '22' }}
                >
                  <Icon className="h-3 w-3 lg:h-4 lg:w-4" style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-bold text-white leading-tight">{card.metric}</p>
                  <p className="text-[10px] lg:text-[11px] mt-0.5" style={{ color: card.color + 'bb' }}>
                    {card.sub}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer — ticker de credibilidade */}
      <footer
        className="-mx-6 lg:-mx-10 xl:-mx-16 overflow-hidden"
        style={{
          background:      'rgba(234,206,0,0.08)',
          borderTop:       '1px solid rgba(234,206,0,0.20)',
          borderBottom:    '1px solid rgba(234,206,0,0.20)',
          maskImage:       'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          animation:       'loginSlideLeft 0.5s ease-out 1s both',
        }}
      >
        <div
          className="flex items-center gap-8 py-2.5 w-max"
          style={{ animation: 'loginTicker 25s linear infinite' }}
          onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-3 shrink-0">
              <span style={{ color: '#EACE00', opacity: 0.6 }}>✦</span>
              <span
                className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: '#EACE00' }}
              >
                {item}
              </span>
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}
