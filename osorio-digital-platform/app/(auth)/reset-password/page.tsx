'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { createClient }      from '@/lib/supabase/client'
import { useRouter }         from 'next/navigation'
import { validatePassword }  from '@/lib/security'
import { PasswordStrength }  from '@/components/auth/password-strength'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [showCf,   setShowCf]   = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [ready,    setReady]    = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const v = validatePassword(password)
    if (!v.valid) {
      setError(v.errors.join('. ') + '.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })

      if (err) {
        setError('Erro ao atualizar senha. O link pode ter expirado.')
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <Image
            src="/images/logo.png"
            alt="Osorio Digital"
            width={160}
            height={56}
            className="h-14 w-auto mx-auto mb-6"
          />
          <h1 className="text-white text-2xl font-black">Nova senha</h1>
          <p className="text-[#666] text-sm mt-1">Escolha uma senha forte para sua conta</p>
        </div>

        {success ? (
          <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Senha atualizada! Redirecionando para o login…
          </div>
        ) : !ready ? (
          <div className="flex items-center gap-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Validando link de recuperação…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Nova senha */}
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444] pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-14 rounded-xl bg-[#111] border border-[#282828] text-white text-sm outline-none pl-11 pr-12 focus:border-[#EACE00]/65 focus:ring-2 focus:ring-[#EACE00]/10 transition-all placeholder:text-[#444]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                  aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Confirmar senha */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444] pointer-events-none" />
              <input
                type={showCf ? 'text' : 'password'}
                placeholder="Confirmar senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full h-14 rounded-xl bg-[#111] border border-[#282828] text-white text-sm outline-none pl-11 pr-12 focus:border-[#EACE00]/65 focus:ring-2 focus:ring-[#EACE00]/10 transition-all placeholder:text-[#444]"
              />
              <button
                type="button"
                onClick={() => setShowCf((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                aria-label={showCf ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              >
                {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-xl bg-[#EACE00] text-black font-bold text-sm disabled:opacity-55 disabled:pointer-events-none hover:-translate-y-px active:translate-y-0 transition-all"
            >
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                : 'Atualizar senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
