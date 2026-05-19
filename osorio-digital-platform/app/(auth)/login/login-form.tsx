'use client'

import { useSearchParams }                                      from 'next/navigation'
import { useState, useTransition }                              from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
         ArrowRight, Mail, Lock as LockIcon }                   from 'lucide-react'
import { login, forgotPassword }                               from './actions'
import { cn }                                                   from '@/lib/utils'

// ── Floating label input ─────────────────────────────────────────────────────
function FloatInput({
  id, name, type = 'text', icon: Icon, label, autoComplete, rightElement, className,
}: {
  id:            string
  name:          string
  type?:         string
  icon:          React.ElementType
  label:         string
  autoComplete?: string
  rightElement?: React.ReactNode
  className?:    string
}) {
  return (
    <div className="relative group">
      {/* Left icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <Icon className="h-[18px] w-[18px] text-[#444] group-focus-within:text-[#EACE00] transition-colors duration-300" />
      </div>

      {/* Input — placeholder=" " is required for the :placeholder-shown CSS trick */}
      <input
        id={id}
        name={name}
        type={type}
        placeholder=" "
        required
        autoComplete={autoComplete}
        className={cn(
          'peer w-full h-[58px] rounded-xl bg-[#111] border border-[#282828] text-white text-sm outline-none',
          'pl-11 pr-4 pt-5 pb-2',
          'transition-all duration-300',
          'focus:border-[#EACE00]/65 focus:ring-2 focus:ring-[#EACE00]/10 focus:bg-[#141414]',
          'placeholder:text-transparent',
          rightElement && 'pr-12',
          className,
        )}
      />

      {/* Floating label — comes AFTER input for CSS sibling selector to work */}
      <label
        htmlFor={id}
        className={cn(
          // Base state: centered in input like a placeholder
          'absolute left-11 pointer-events-none select-none',
          'top-1/2 -translate-y-1/2 text-sm text-[#555]',
          'transition-all duration-300',
          // Focused state: move to top, shrink, turn yellow
          'peer-focus:top-[14px] peer-focus:translate-y-0',
          'peer-focus:text-[10px] peer-focus:font-bold peer-focus:tracking-wider peer-focus:uppercase peer-focus:text-[#EACE00]',
          // Filled state (placeholder not shown): same position as focused
          'peer-[:not(:placeholder-shown)]:top-[14px] peer-[:not(:placeholder-shown)]:translate-y-0',
          'peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold',
          'peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase',
          'peer-[:not(:placeholder-shown)]:text-[#555]',
        )}
      >
        {label}
      </label>

      {/* Right element (eye toggle, etc.) */}
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          {rightElement}
        </div>
      )}
    </div>
  )
}

// ── Main form ────────────────────────────────────────────────────────────────
export default function LoginForm() {
  const searchParams = useSearchParams()
  const errorMsg   = searchParams.get('error')
  const successMsg = searchParams.get('success')

  const [showPassword,  setShowPassword]  = useState(false)
  const [showForgot,    setShowForgot]    = useState(false)
  const [isLoginPending,  startLoginTransition]  = useTransition()
  const [isForgotPending, startForgotTransition] = useTransition()

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
          action={(formData) => {
            startLoginTransition(async () => {
              await login(formData)
            })
          }}
          className="space-y-4"
        >
          {/* E-mail com floating label */}
          <FloatInput
            id="email"
            name="email"
            type="email"
            icon={Mail}
            label="E-mail"
            autoComplete="email"
          />

          {/* Senha com floating label + olho */}
          <FloatInput
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            icon={LockIcon}
            label="Senha"
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="h-8 w-8 grid place-items-center rounded-lg text-[#555] hover:text-white hover:bg-white/5 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye    className="h-4 w-4" />}
              </button>
            }
          />

          {/* Lembrar + esqueci */}
          <div className="flex items-center justify-between text-sm pt-0.5">
            <label className="flex items-center gap-2 text-[#666] cursor-pointer select-none hover:text-white/70 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#333] bg-[#1a1a1a] accent-[#EACE00]"
              />
              Lembrar-me
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-[#EACE00]/70 hover:text-[#EACE00] font-medium transition-colors text-sm"
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Botão Entrar com shimmer */}
          <button
            type="submit"
            disabled={isLoginPending}
            className="relative w-full h-12 rounded-xl bg-[#EACE00] text-black font-bold text-sm overflow-hidden group transition-all duration-300 hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:pointer-events-none mt-1"
            style={{ animation: 'loginButtonGlow 2.5s ease-in-out infinite alternate' }}
          >
            {/* Shimmer — brilho da esquerda para direita no hover */}
            <span className="absolute inset-0 -skew-x-12 translate-x-[-150%] group-hover:translate-x-[200%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
            {/* Conteúdo */}
            <span className="relative flex items-center justify-center gap-2">
              {isLoginPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</>
              ) : (
                <>Entrar <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </span>
          </button>
        </form>
      ) : (
        /* ── Formulário de recuperação de senha ─────────────────── */
        <form
          action={(formData) => {
            startForgotTransition(async () => {
              await forgotPassword(formData)
            })
          }}
          className="space-y-5"
        >
          <p className="text-sm text-[#666] leading-relaxed">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          <FloatInput
            id="forgot-email"
            name="email"
            type="email"
            icon={Mail}
            label="E-mail"
            autoComplete="email"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="flex-1 h-12 rounded-xl border border-[#282828] bg-transparent text-[#888] text-sm font-medium hover:border-[#404040] hover:text-white hover:bg-white/4 transition-all"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isForgotPending}
              className="relative flex-1 h-12 rounded-xl bg-[#EACE00] text-black font-bold text-sm overflow-hidden group shadow-[0_0_20px_rgba(234,206,0,0.2)] hover:-translate-y-px transition-all disabled:opacity-55 disabled:pointer-events-none"
            >
              <span className="absolute inset-0 -skew-x-12 translate-x-[-150%] group-hover:translate-x-[200%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
              <span className="relative flex items-center justify-center gap-2">
                {isForgotPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                ) : (
                  'Enviar link'
                )}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
