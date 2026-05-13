'use client'

import { useState }    from 'react'
import { updateEmail } from '../actions'
import { Card }        from '@/components/ui/card'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import { Button }      from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    setSuccess(null)

    const result = await updateEmail({ email })

    if (!result.success) {
      setError(result.error ?? 'Erro')
      setIsPending(false)
      return
    }

    setSuccess(result.message ?? 'Email enviado para confirmação')
    setEmail('')
    setIsPending(false)
  }

  return (
    <Card className="bg-[#111] border-[#222] p-6">
      <h2 className="text-lg font-semibold text-[#F5F5F0]">Email</h2>
      <p className="text-sm text-[#888] mt-1 mb-4">
        Email atual:{' '}
        <span className="text-[#F5F5F0] font-medium">{currentEmail}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new_email">Novo email</Label>
          <Input
            id="new_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            placeholder="seu-novo-email@exemplo.com"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />{success}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || !email}
            className="bg-[#EACE00] text-black hover:bg-[#EACE00]/90 font-semibold"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
              : 'Trocar email'
            }
          </Button>
        </div>
      </form>
    </Card>
  )
}
