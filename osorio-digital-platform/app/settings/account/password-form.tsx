'use client'

import { useState }        from 'react'
import { changePassword }  from '../actions'
import { Card }            from '@/components/ui/card'
import { Input }           from '@/components/ui/input'
import { Label }           from '@/components/ui/label'
import { Button }          from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState<string | null>(null)
  const [success, setSuccess]                 = useState(false)
  const [isPending, setIsPending]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setIsPending(true)
    const result = await changePassword({ currentPassword, newPassword })

    if (!result.success) {
      setError(result.error ?? 'Erro')
      setIsPending(false)
      return
    }

    setSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setIsPending(false)
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <Card className="bg-[#111] border-[#222] p-6">
      <h2 className="text-lg font-semibold text-[#F5F5F0]">Senha</h2>
      <p className="text-sm text-[#888] mt-1 mb-4">
        Recomendamos uma senha forte com no mínimo 8 caracteres.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current_password">Senha atual</Label>
          <Input
            id="current_password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isPending}
            autoComplete="current-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new_password">Nova senha</Label>
          <Input
            id="new_password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isPending}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar nova senha</Label>
          <Input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isPending}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />Senha alterada com sucesso
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
            className="bg-[#EACE00] text-black hover:bg-[#EACE00]/90 font-semibold"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Alterando...</>
              : 'Alterar senha'
            }
          </Button>
        </div>
      </form>
    </Card>
  )
}
