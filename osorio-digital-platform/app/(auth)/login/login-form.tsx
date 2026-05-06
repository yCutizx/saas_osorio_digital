'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { login, forgotPassword } from './actions'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'

const inputClass =
  'w-full h-12 rounded-xl bg-[#1a1a1a]/60 border border-[#222] px-4 text-sm text-white placeholder:text-[#888]/60 outline-none transition-all focus:border-[#EACE00]/60 focus:ring-2 focus:ring-[#EACE00]/20 focus:bg-[#1a1a1a]'

const labelClass = 'text-[10px] font-medium uppercase tracking-widest text-[#888]'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const errorMsg   = searchParams.get('error')
  const successMsg = searchParams.get('success')

  const [showPassword,  setShowPassword]  = useState(false)
  const [showForgot,    setShowForgot]    = useState(false)
  const [loginPending,  setLoginPending]  = useState(false)
  const [forgotPending, setForgotPending] = useState(false)

  return (
    <div className="space-y-5">

      {/* Banner de erro */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      {/* Banner de sucesso */}
      {successMsg && (
        <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {decodeURIComponent(successMsg)}
        </div>
      )}

      {!showForgot ? (
        /* ── Formulário de login ─────────────────────────────────── */
        <form
          action={async (formData) => {
            setLoginPending(true)
            await login(formData)
            setLoginPending(false)
          }}
          className="space-y-5"
        >
          {/* E-mail */}
          <div className="space-y-2">
            <label htmlFor="email" className={labelClass}>E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <label htmlFor="password" className={labelClass}>Senha</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-lg text-[#888] hover:text-white hover:bg-white/5 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Lembrar-me + Esqueci a senha */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#888] cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#333] bg-[#1a1a1a] accent-[#EACE00]"
              />
              Lembrar-me
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-[#EACE00]/80 hover:text-[#EACE00] font-medium transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Botão entrar */}
          <button
            type="submit"
            disabled={loginPending}
            className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-[#f5d800] to-[#EACE00] text-black font-semibold text-sm shadow-[0_0_30px_rgba(234,206,0,0.3)] hover:shadow-[0_25px_70px_-15px_rgba(234,206,0,0.55)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loginPending ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                Entrar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </button>
        </form>
      ) : (
        /* ── Formulário de recuperação de senha ─────────────────── */
        <form
          action={async (formData) => {
            setForgotPending(true)
            await forgotPassword(formData)
            setForgotPending(false)
          }}
          className="space-y-5"
        >
          <p className="text-sm text-[#888] leading-relaxed">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          <div className="space-y-2">
            <label htmlFor="forgot-email" className={labelClass}>E-mail</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="flex-1 h-12 rounded-xl border border-[#333] bg-transparent text-[#888] text-sm font-medium hover:border-[#444] hover:text-white hover:bg-white/5 transition-all"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={forgotPending}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#f5d800] to-[#EACE00] text-black font-semibold text-sm shadow-[0_0_20px_rgba(234,206,0,0.25)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {forgotPending ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Enviar link'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
