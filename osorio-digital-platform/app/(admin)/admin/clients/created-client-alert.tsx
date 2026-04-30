'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, Eye, EyeOff, X } from 'lucide-react'

interface Props {
  email:    string
  password: string
}

export function CreatedClientAlert({ email, password }: Props) {
  const [visible,  setVisible]  = useState(true)
  const [showPwd,  setShowPwd]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  if (!visible) return null

  function copyPassword() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative bg-green-500/10 border border-green-500/30 rounded-xl p-4 pr-10">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
        <div className="space-y-2 min-w-0">
          <p className="text-green-300 font-semibold text-sm">
            Cliente criado com sucesso!
          </p>
          <p className="text-white/60 text-xs">
            Usuário criado para <strong className="text-white/80">{decodeURIComponent(email)}</strong>.
            Compartilhe a senha temporária abaixo com o cliente — ela não será exibida novamente.
          </p>

          <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 mt-1">
            <code className="text-green-300 text-sm font-mono flex-1 select-all">
              {showPwd ? decodeURIComponent(password) : '••••••••••••'}
            </code>
            <button
              onClick={() => setShowPwd((v) => !v)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={copyPassword}
              className="text-white/40 hover:text-green-400 transition-colors"
              aria-label="Copiar senha"
            >
              <Copy className="h-4 w-4" />
            </button>
            {copied && (
              <span className="text-xs text-green-400">Copiado!</span>
            )}
          </div>

          <p className="text-white/40 text-xs">
            O cliente deve alterar a senha no primeiro acesso.
          </p>
        </div>
      </div>
    </div>
  )
}
