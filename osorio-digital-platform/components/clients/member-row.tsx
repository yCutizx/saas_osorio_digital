'use client'

import { useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, ShieldCheck, ShieldOff, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { removeMemberAction } from '@/app/actions/client-members'

interface Props {
  clientId:  string
  userId:    string
  fullName:  string | null
  email:     string
  linkedAt:  string  // created_at do assignment (ISO)
  mfaEnabled: boolean
}

export function MemberRow({ clientId, userId, fullName, email, linkedAt, mfaEnabled }: Props) {
  const [pending, startRemove] = useTransition()

  function handleRemove() {
    if (!confirm(`Desvincular ${fullName ?? email} deste cliente? O cadastro de usuário NÃO será deletado.`)) return
    startRemove(async () => {
      const r = await removeMemberAction(clientId, userId)
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success('Membro desvinculado')
    })
  }

  const linkedFmt = format(parseISO(linkedAt), "dd/MM/yyyy", { locale: ptBR })

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#0A0A0A]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-full bg-[#EACE00]/15 text-[#EACE00] flex items-center justify-center text-xs font-bold shrink-0">
          {(fullName ?? email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-white font-medium truncate">{fullName ?? '—'}</p>
          <p className="text-xs text-[#888] truncate">{email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {mfaEnabled ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium border border-green-500/20">
            <ShieldCheck className="h-3 w-3" />
            MFA ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-medium border border-yellow-500/20">
            <ShieldOff className="h-3 w-3" />
            Sem MFA
          </span>
        )}
        <span className="hidden sm:inline text-[10px] text-[#666]">{linkedFmt}</span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          title="Desvincular do cliente"
          className="p-1.5 rounded-lg text-[#888] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
        </button>
      </div>
    </li>
  )
}
