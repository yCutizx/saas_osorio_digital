'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle, Plug, RefreshCw, Unplug, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  testMetaConnectionAction,
  connectMetaAccountAction,
  syncMetaAccountNowAction,
  syncMetaAccountHistoryAction,
  disconnectMetaAccountAction,
} from '@/app/actions/meta-sync'
import { useCooldown } from '@/lib/hooks/use-cooldown'

interface Props {
  clientId: string
  initialAdAccountId: string | null
  lastSyncAt: string | null
  lastSyncStatus: 'success' | 'error' | 'pending' | null
  lastSyncError: string | null
}

export function MetaIntegrationSection({
  clientId,
  initialAdAccountId,
  lastSyncAt,
  lastSyncStatus,
  lastSyncError,
}: Props) {
  const router = useRouter()
  const [adAccountId, setAdAccountId] = useState(initialAdAccountId ?? '')
  const [isTestingConnection, startTest] = useTransition()
  const [isConnecting, startConnect] = useTransition()
  const [isSyncing, startSync] = useTransition()
  const [isSyncingHistory, startSyncHistory] = useTransition()
  const [isDisconnecting, startDisconnect] = useTransition()

  // Cooldown compartilhado entre os 2 botões de sync (mesma quota Meta).
  const syncCooldown = useCooldown(60)

  const isConnected = !!initialAdAccountId
  const hasChanged = adAccountId.trim() !== (initialAdAccountId ?? '')

  function handleTest() {
    if (!adAccountId.trim()) {
      toast.error('Informe o Ad Account ID antes de testar')
      return
    }
    startTest(async () => {
      const r = await testMetaConnectionAction(adAccountId.trim())
      if ('error' in r) toast.error(r.error)
      else toast.success(`Conta acessível: ${r.account_name}`)
    })
  }

  function handleConnect() {
    startConnect(async () => {
      const r = await connectMetaAccountAction(clientId, adAccountId.trim())
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success(`Conectado: ${r.account_name}`)
      router.refresh()
    })
  }

  function handleSync() {
    if (syncCooldown.isCoolingDown) return
    startSync(async () => {
      toast.info('Sincronizando... pode levar alguns segundos')
      try {
        const r = await syncMetaAccountNowAction(clientId, 30)
        if ('error' in r) {
          toast.error(r.error)
          return
        }
        toast.success(`Sincronizado! ${r.campaigns} campanhas, ${r.rows} dias`)
        router.refresh()
      } finally {
        syncCooldown.startCooldown()
      }
    })
  }

  function handleSyncHistory() {
    if (syncCooldown.isCoolingDown) return
    if (!confirm('Sincronizar últimos 90 dias? Pode demorar 1-2 minutos e vai sobrescrever dados existentes com a lógica atual.')) return
    startSyncHistory(async () => {
      toast.info('Sincronizando histórico de 90 dias... aguarde')
      try {
        const r = await syncMetaAccountHistoryAction(clientId)
        if ('error' in r) {
          toast.error(r.error)
          return
        }
        toast.success(`Histórico sincronizado! ${r.campaigns} campanhas, ${r.rows} dias`)
        router.refresh()
      } finally {
        syncCooldown.startCooldown()
      }
    })
  }

  function handleDisconnect() {
    if (!confirm('Desconectar a integração? Os dados históricos serão mantidos, mas não haverá mais sincronização automática.')) return
    startDisconnect(async () => {
      const r = await disconnectMetaAccountAction(clientId)
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success('Desconectado')
      setAdAccountId('')
      router.refresh()
    })
  }

  const anyLoading = isTestingConnection || isConnecting || isSyncing || isSyncingHistory || isDisconnecting

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F0] flex items-center gap-2">
            <Plug className="h-4 w-4 text-[#EACE00]" />
            Integração Meta Ads
          </h3>
          <p className="text-xs text-[#888] mt-1">
            Sincronização automática de campanhas via API. Substitui o import CSV manual.
          </p>
        </div>
        {isConnected && (
          <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Conectado
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-[#888] font-medium">Ad Account ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
            placeholder="act_1234567890"
            disabled={anyLoading}
            className="flex-1 bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] placeholder-[#444] focus:outline-none focus:border-[#EACE00] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={anyLoading || !adAccountId.trim()}
            className="px-4 py-2 text-sm bg-[#1a1a1a] border border-[#222] rounded-lg text-[#ccc] hover:bg-[#222] disabled:opacity-50 inline-flex items-center justify-center gap-2 min-w-[80px]"
          >
            {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
          </button>
        </div>
        <p className="text-xs text-[#666]">
          Formato: <code>act_XXXXXXXXXXX</code>. Encontre em business.facebook.com → Configurações → Contas de anúncio.
        </p>
      </div>

      {isConnected && lastSyncAt && (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#888]">Última sincronização:</span>
            <span className="text-[#ccc]">
              {format(new Date(lastSyncAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
            {lastSyncStatus === 'success' && (
              <span className="inline-flex items-center gap-1 text-green-400">
                <CheckCircle2 className="h-3 w-3" /> OK
              </span>
            )}
            {lastSyncStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-red-400">
                <AlertCircle className="h-3 w-3" /> Erro
              </span>
            )}
            {lastSyncStatus === 'pending' && (
              <span className="inline-flex items-center gap-1 text-yellow-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Em andamento
              </span>
            )}
          </div>
          {lastSyncStatus === 'error' && lastSyncError && (
            <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 mt-1">
              {lastSyncError}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#222]">
        {!isConnected || hasChanged ? (
          <button
            type="button"
            onClick={handleConnect}
            disabled={anyLoading || !adAccountId.trim()}
            className="inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
          >
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            {hasChanged && isConnected ? 'Atualizar conexão' : 'Conectar'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSync}
              disabled={anyLoading || syncCooldown.isCoolingDown}
              className="inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncCooldown.isCoolingDown ? `Aguarde ${syncCooldown.remaining}s...` : 'Sincronizar agora'}
            </button>
            <button
              type="button"
              onClick={handleSyncHistory}
              disabled={anyLoading || syncCooldown.isCoolingDown}
              className="inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#222] text-[#ccc] px-4 py-2 rounded-lg hover:bg-[#222] disabled:opacity-50 transition-colors"
            >
              {isSyncingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
              {syncCooldown.isCoolingDown ? `Aguarde ${syncCooldown.remaining}s...` : 'Sincronizar 90 dias'}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={anyLoading}
              className="inline-flex items-center gap-2 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
              Desconectar
            </button>
          </>
        )}
      </div>

      {syncCooldown.isCoolingDown && (
        <p className="text-xs text-[#888]">
          Sincronização Meta disponível novamente em {syncCooldown.remaining}s
        </p>
      )}

      <p className="text-xs text-[#666] pt-2">
        Sincronização automática diária às 03:00 (BRT). Use &quot;Sincronizar agora&quot; pra atualização imediata.
      </p>
    </div>
  )
}
