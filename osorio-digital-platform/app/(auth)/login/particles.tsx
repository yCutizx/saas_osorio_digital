'use client'

import { useEffect, useRef } from 'react'

const COUNT = 30

export function Particles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    children.forEach((div) => {
      const duration = 3 + Math.random() * 5
      const delay    = Math.random() * 6
      div.style.animation = `loginParticlePulse ${duration}s ease-in-out ${delay}s infinite`
    })
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: COUNT }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width:      `${2 + Math.random() * 4}px`,
            height:     `${2 + Math.random() * 4}px`,
            left:       `${Math.random() * 100}%`,
            top:        `${Math.random() * 100}%`,
            background: i % 5 === 0
              ? `rgba(234,206,0,0.9)`
              : i % 3 === 0
                ? `rgba(234,206,0,0.5)`
                : `rgba(234,206,0,0.25)`,
            boxShadow:  i % 4 === 0
              ? `0 0 6px 2px rgba(234,206,0,0.4)`
              : undefined,
            opacity: 0,
          }}
        />
      ))}
    </div>
  )
}
