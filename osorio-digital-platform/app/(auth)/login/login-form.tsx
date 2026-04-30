'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { login, forgotPassword } from './actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const errorMsg   = searchParams.get('error')
  const successMsg = searchParams.get('success')

  const [showPassword,  setShowPassword]  = useState(false)
  const [showForgot,    setShowForgot]    = useState(false)
  const [loginPending,  setLoginPending]  = useState(false)
  const [forgotPending, setForgotPending] = useState(false)

  return (
    <div className="space-y-6">
      {/* Mensagem de erro */}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      {/* Mensagem de sucesso */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {decodeURIComponent(successMsg)}
        </div>
      )}

      {!showForgot ? (
        /* ── Formulário de login ── */
        <form
          action={async (formData) => {
            setLoginPending(true)
            await login(formData)
            setLoginPending(false)
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/70 text-sm">
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow focus:ring-brand-yellow/20 h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/70 text-sm">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow focus:ring-brand-yellow/20 h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm text-brand-yellow/80 hover:text-brand-yellow transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>

          <Button
            type="submit"
            disabled={loginPending}
            className="w-full h-11 bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow/90 transition-colors disabled:opacity-60"
          >
            {loginPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      ) : (
        /* ── Formulário de recuperação de senha ── */
        <form
          action={async (formData) => {
            setForgotPending(true)
            await forgotPassword(formData)
            setForgotPending(false)
          }}
          className="space-y-5"
        >
          <div className="space-y-1">
            <p className="text-white/70 text-sm">
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-white/70 text-sm">
              E-mail
            </Label>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow focus:ring-brand-yellow/20 h-11"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForgot(false)}
              className="flex-1 h-11 border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            >
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={forgotPending}
              className="flex-1 h-11 bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow/90 disabled:opacity-60"
            >
              {forgotPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Enviar link'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
