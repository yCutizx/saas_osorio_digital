'use client'

import { validatePassword } from '@/lib/security'

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const { strength, errors } = validatePassword(password)

  const meta = {
    weak:   { label: 'Fraca',  color: '#EF4444', bars: 1 },
    medium: { label: 'Média',  color: '#F59E0B', bars: 2 },
    strong: { label: 'Forte',  color: '#22C55E', bars: 3 },
  }[strength]

  return (
    <div className="space-y-1.5 pt-1">
      {/* Barra de força */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < meta.bars ? meta.color : '#222' }}
          />
        ))}
      </div>

      {/* Label */}
      <p className="text-xs font-medium" style={{ color: meta.color }}>
        Senha {meta.label}
      </p>

      {/* Erros */}
      {errors.length > 0 && (
        <ul className="space-y-0.5">
          {errors.map((err) => (
            <li key={err} className="flex items-center gap-1.5 text-[11px] text-[#666]">
              <span className="text-red-500 text-xs">✗</span>
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
