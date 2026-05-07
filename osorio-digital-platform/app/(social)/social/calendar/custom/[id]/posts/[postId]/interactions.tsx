'use client'

import { useState, useTransition } from 'react'
import { MessageSquare, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { addCustomCommentAction, changeCustomStatusAction } from './actions'
import { cn } from '@/lib/utils'

export function CustomCommentBox({ postId }: { postId: string }) {
  const [comment, setComment] = useState('')
  const [pending, startTrans] = useTransition()

  function submit() {
    if (!comment.trim()) return
    startTrans(async () => {
      const r = await addCustomCommentAction(postId, comment, 'comment')
      if (r.error) {
        toast.error(r.error)
      } else {
        setComment('')
        toast.success('Comentário adicionado.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Adicionar comentário ou anotação..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 resize-none text-sm"
      />
      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={pending || !comment.trim()}
          className="h-8 px-4 bg-[#EACE00] text-black text-xs font-semibold hover:bg-[#EACE00]/90 disabled:opacity-50"
        >
          {pending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <><MessageSquare className="h-3 w-3 mr-1" />Comentar</>}
        </Button>
      </div>
    </div>
  )
}

export function CustomStatusChanger({
  postId,
  currentStatus,
}: {
  postId:        string
  currentStatus: string
}) {
  const [pending, startTrans] = useTransition()

  const transitions: Record<string, { label: string; next: string; classes: string }> = {
    draft:            { next: 'pending_approval', label: 'Enviar para Revisão',   classes: 'bg-[#EACE00] text-black hover:bg-[#EACE00]/90' },
    pending_approval: { next: 'approved',         label: 'Aprovar',               classes: 'bg-green-500 text-white hover:bg-green-400' },
    approved:         { next: 'published',        label: 'Marcar como Publicado', classes: 'bg-blue-500 text-white hover:bg-blue-400' },
    rejected:         { next: 'draft',            label: 'Voltar para Rascunho',  classes: 'border border-white/20 text-white/70 hover:bg-white/5' },
  }

  const t = transitions[currentStatus]
  if (!t) return null

  return (
    <button
      onClick={() => {
        startTrans(async () => {
          const r = await changeCustomStatusAction(postId, t.next)
          if (r?.error) {
            toast.error(r.error)
          } else {
            toast.success('Status atualizado.')
          }
        })
      }}
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
        t.classes
      )}
    >
      {pending
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <RefreshCw className="h-4 w-4" />}
      {t.label}
    </button>
  )
}
