'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, MessageSquare, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { addCommentAction, changeStatusAction } from './actions'
import { cn } from '@/lib/utils'

export function ApprovalButtons({
  postId,
  currentStatus,
}: {
  postId:        string
  currentStatus: string
}) {
  const [mode, setMode]       = useState<'idle' | 'rejecting'>('idle')
  const [comment, setComment] = useState('')
  const [pending, startTrans] = useTransition()

  async function approve() {
    startTrans(async () => {
      const r = await addCommentAction(postId, 'Post aprovado pelo cliente.', 'approval')
      if (r.error) {
        toast.error(r.error)
      } else {
        toast.success('Post aprovado! A equipe será notificada.')
      }
    })
  }

  async function reject() {
    if (!comment.trim()) return
    startTrans(async () => {
      const r = await addCommentAction(postId, comment, 'rejection')
      if (r.error) {
        toast.error(r.error)
      } else {
        setMode('idle')
        setComment('')
        toast.success('Reprovação registrada. A equipe irá revisar o post.')
      }
    })
  }

  if (currentStatus === 'approved') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4" /> Post aprovado
      </div>
    )
  }

  if (currentStatus === 'rejected') {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
        <XCircle className="h-4 w-4" /> Post reprovado
      </div>
    )
  }

  if (currentStatus !== 'pending_approval') return null

  return (
    <div className="space-y-3">
      {mode === 'idle' ? (
        <div className="flex gap-3">
          <Button
            onClick={approve}
            disabled={pending}
            className="flex-1 h-10 bg-green-500 hover:bg-green-400 text-white font-semibold"
          >
            {pending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovar</>}
          </Button>
          <Button
            onClick={() => setMode('rejecting')}
            disabled={pending}
            variant="outline"
            className="flex-1 h-10 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400"
          >
            <XCircle className="h-4 w-4 mr-1.5" /> Reprovar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Descreva o motivo da reprovação..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-red-400 resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setMode('idle')}
              variant="ghost"
              className="flex-1 h-9 text-white/50 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={reject}
              disabled={pending || !comment.trim()}
              className="flex-1 h-9 bg-red-500 hover:bg-red-400 text-white font-semibold"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Reprovação'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CommentBox({ postId }: { postId: string }) {
  const [comment, setComment] = useState('')
  const [pending, startTrans] = useTransition()

  function submit() {
    if (!comment.trim()) return
    startTrans(async () => {
      const r = await addCommentAction(postId, comment, 'comment')
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
        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow resize-none text-sm"
      />
      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={pending || !comment.trim()}
          className="h-8 px-4 bg-brand-yellow text-brand-black text-xs font-semibold hover:bg-brand-yellow/90 disabled:opacity-50"
        >
          {pending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <><MessageSquare className="h-3 w-3 mr-1" />Comentar</>}
        </Button>
      </div>
    </div>
  )
}

export function StatusChanger({
  postId,
  currentStatus,
}: {
  postId:        string
  currentStatus: string
}) {
  const [pending, startTrans] = useTransition()

  const transitions: Record<string, { label: string; next: string; classes: string }> = {
    draft:            { next: 'pending_approval', label: 'Enviar para Aprovação', classes: 'bg-brand-yellow text-brand-black hover:bg-brand-yellow/90' },
    approved:         { next: 'published',        label: 'Marcar como Publicado', classes: 'bg-blue-500 text-white hover:bg-blue-400' },
    rejected:         { next: 'draft',            label: 'Voltar para Rascunho',  classes: 'border border-white/20 text-white/70 hover:bg-white/5' },
    pending_approval: { next: 'draft',            label: 'Voltar para Rascunho',  classes: 'border border-white/20 text-white/70 hover:bg-white/5' },
  }

  const t = transitions[currentStatus]
  if (!t) return null

  return (
    <button
      onClick={() => {
        startTrans(async () => {
          const r = await changeStatusAction(postId, t.next)
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
