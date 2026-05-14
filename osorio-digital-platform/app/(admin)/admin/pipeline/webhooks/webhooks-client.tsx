'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Copy, Check, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { createWebhookAction, toggleWebhookAction, deleteWebhookAction } from '@/app/actions/pipeline'

type WebhookRow = {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  secret_key: string
  created_at: string
}

type LogRow = {
  id: string
  webhook_id: string
  event: string
  status: string
  created_at: string
  webhook: { name: string } | null
}

interface WebhooksClientProps {
  webhooks: WebhookRow[]
  logs: LogRow[]
}

const ALL_EVENTS = [
  { value: 'lead.created',       label: 'Lead Criado' },
  { value: 'lead.updated',       label: 'Lead Atualizado' },
  { value: 'lead.stage_changed', label: 'Lead Mudou de Estágio' },
]

const STATUS_COLORS: Record<string, string> = {
  success: '#22C55E',
  error:   '#EF4444',
  pending: '#F59E0B',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[#888] hover:text-white transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function WebhooksClient({ webhooks, logs }: WebhooksClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) return
    startTransition(async () => {
      try {
        await createWebhookAction({ name, url, events: selectedEvents })
        toast.success('Webhook criado!')
        setShowForm(false)
        setName('')
        setUrl('')
        setSelectedEvents([])
        router.refresh()
      } catch {
        toast.error('Erro ao criar webhook')
      }
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      try {
        await toggleWebhookAction(id, active)
        toast.success(active ? 'Webhook ativado!' : 'Webhook desativado!')
        router.refresh()
      } catch {
        toast.error('Erro ao atualizar webhook')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja deletar este webhook?')) return
    startTransition(async () => {
      try {
        await deleteWebhookAction(id)
        toast.success('Webhook deletado!')
        router.refresh()
      } catch {
        toast.error('Erro ao deletar webhook')
      }
    })
  }

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d))

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Webhook
        </button>
      </div>

      {/* Webhook List */}
      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Webhook className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">Nenhum webhook configurado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-[#111] border border-[#222] rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-sm">{wh.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wh.active ? 'bg-green-500/20 text-green-400' : 'bg-[#333] text-[#888]'}`}>
                      {wh.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-[#888] text-xs mb-2 truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {wh.events.map((ev) => (
                      <span key={ev} className="text-xs bg-[#1a1a1a] text-[#888] px-2 py-0.5 rounded-full border border-[#333]">
                        {ev}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#555] text-xs font-mono truncate max-w-[200px]">
                      {wh.secret_key.slice(0, 8)}...{wh.secret_key.slice(-4)}
                    </span>
                    <CopyButton text={wh.secret_key} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(wh.id, !wh.active)}
                    disabled={isPending}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${wh.active ? 'bg-[#EACE00]' : 'bg-[#333]'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${wh.active ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    disabled={isPending}
                    className="text-[#555] hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Logs Recentes</h2>
        {logs.length === 0 ? (
          <p className="text-[#555] text-sm text-center py-6">Nenhum log registrado.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const statusColor = STATUS_COLORS[log.status] ?? '#6B7280'
              return (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ background: statusColor + '22', color: statusColor }}
                  >
                    {log.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{log.event}</p>
                    {log.webhook && (
                      <p className="text-[#555] text-[10px]">{log.webhook.name}</p>
                    )}
                  </div>
                  <span className="text-[#555] text-xs shrink-0">{fmtDate(log.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Webhook Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">Novo Webhook</h3>
              <button onClick={() => setShowForm(false)} className="text-[#888] hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[#888] text-xs mb-1 block">Nome *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="ex: Integração CRM"
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
                />
              </div>
              <div>
                <label className="text-[#888] text-xs mb-1 block">URL *</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
                />
              </div>
              <div>
                <label className="text-[#888] text-xs mb-2 block">Eventos *</label>
                <div className="space-y-2">
                  {ALL_EVENTS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.value)}
                        onChange={() => toggleEvent(ev.value)}
                        className="accent-[#EACE00]"
                      />
                      <span className="text-white text-sm">{ev.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-[#333] text-[#888] rounded-xl text-sm hover:border-[#555] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || selectedEvents.length === 0}
                  className="flex-1 py-2 bg-[#EACE00] text-black font-semibold rounded-xl text-sm hover:bg-[#f5d800] transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Criando...' : 'Criar Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
