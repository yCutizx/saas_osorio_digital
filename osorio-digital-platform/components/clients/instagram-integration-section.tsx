'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, CheckCircle2, AlertCircle, AtSign, RefreshCw, Unplug, Search, CalendarRange,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  listAvailableIGAccountsAction,
  connectIGAccountAction,
  syncIGAccountNowAction,
  syncIGAccountHistoryAction,
  disconnectIGAccountAction,
} from '@/app/actions/instagram-sync'

interface ExistingConnection {
  ig_user_id:       string
  ig_username:      string | null
  account_kind:     'business' | 'creator' | null
  page_name:        string | null
  last_sync_at:     string | null
  last_sync_status: 'success' | 'error' | 'pending' | null
  last_sync_error:  string | null
}

interface DiscoveredAccount {
  page_id:     string
  page_name:   string
  ig_user_id:  string | null
  ig_username: string | null
}

interface Props {
  clientId:    string
  connection:  ExistingConnection | null
}

export function InstagramIntegrationSection({ clientId, connection }: Props) {
  const router = useRouter()
  const [discovered, setDiscovered]   = useState<DiscoveredAccount[]>([])
  const [selected,   setSelected]     = useState<string>('')
  const [isSearching,    startSearch]    = useTransition()
  const [isConnecting,   startConnect]   = useTransition()
  const [isSyncing,      startSync]      = useTransition()
  const [isSyncingHist,  startSyncHist]  = useTransition()
  const [isDisconnecting, startDisconnect] = useTransition()

  const isConnected = !!connection
  const anyLoading  = isSearching || isConnecting || isSyncing || isSyncingHist || isDisconnecting

  function handleSearch() {
    startSearch(async () => {
      const r = await listAvailableIGAccountsAction()
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      if (r.accounts.length === 0) {
        toast.info('Nenhuma conta IG Business/Creator encontrada nas Pages do token.')
      }
      setDiscovered(r.accounts as DiscoveredAccount[])
    })
  }

  function handleConnect() {
    const picked = discovered.find((a) => a.ig_user_id === selected)
    if (!picked || !picked.ig_user_id) {
      toast.error('Selecione uma conta IG')
      return
    }
    startConnect(async () => {
      const r = await connectIGAccountAction({
        clientId,
        igUserId:   picked.ig_user_id!,
        igUsername: picked.ig_username ?? '',
        pageId:     picked.page_id,
        pageName:   picked.page_name,
      })
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success(`Instagram @${picked.ig_username ?? picked.ig_user_id} conectado`)
      router.refresh()
    })
  }

  function handleSync() {
    startSync(async () => {
      toast.info('Sincronizando últimos 7 dias do IG...')
      const r = await syncIGAccountNowAction(clientId, 7)
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success(`Instagram sincronizado: ${r.days} dia${r.days !== 1 ? 's' : ''}`)
      router.refresh()
    })
  }

  function handleSyncHistory() {
    if (!confirm('Sincronizar histórico de 30 dias do Instagram? (limite da API)')) return
    startSyncHist(async () => {
      toast.info('Sincronizando histórico... aguarde')
      const r = await syncIGAccountHistoryAction(clientId)
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success(`Histórico IG sincronizado: ${r.days} dias`)
      router.refresh()
    })
  }

  function handleDisconnect() {
    if (!connection) return
    if (!confirm('Desconectar Instagram? Os dados históricos serão mantidos.')) return
    startDisconnect(async () => {
      const r = await disconnectIGAccountAction(clientId, connection.ig_user_id)
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success('Instagram desconectado')
      router.refresh()
    })
  }

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F0] flex items-center gap-2">
            <AtSign className="h-4 w-4 text-[#EACE00]" />
            Integração Instagram
          </h3>
          <p className="text-xs text-[#888] mt-1">
            Métricas do perfil via Graph API (impressões, alcance, visitas, cliques no link).
            Conta precisa ser Business ou Creator.
          </p>
        </div>
        {isConnected && (
          <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Conectado
          </span>
        )}
      </div>

      {isConnected ? (
        <>
          <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-3 text-sm">
            <p className="text-[#F5F5F0] font-semibold">
              @{connection!.ig_username ?? connection!.ig_user_id}
              <span className="ml-2 text-xs text-[#888]">
                ({connection!.account_kind === 'business' ? 'Business' : 'Creator'})
              </span>
            </p>
            {connection!.page_name && (
              <p className="text-xs text-[#666] mt-0.5">via Page: {connection!.page_name}</p>
            )}
          </div>

          {connection!.last_sync_at && (
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#888]">Última sincronização:</span>
                <span className="text-[#ccc]">
                  {format(new Date(connection!.last_sync_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
                {connection!.last_sync_status === 'success' && (
                  <span className="inline-flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> OK
                  </span>
                )}
                {connection!.last_sync_status === 'error' && (
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <AlertCircle className="h-3 w-3" /> Erro
                  </span>
                )}
                {connection!.last_sync_status === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-yellow-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Em andamento
                  </span>
                )}
              </div>
              {connection!.last_sync_status === 'error' && connection!.last_sync_error && (
                <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 mt-1">
                  {connection!.last_sync_error}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#222]">
            <button
              type="button"
              onClick={handleSync}
              disabled={anyLoading}
              className="inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar agora
            </button>
            <button
              type="button"
              onClick={handleSyncHistory}
              disabled={anyLoading}
              className="inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#222] text-[#ccc] px-4 py-2 rounded-lg hover:bg-[#222] disabled:opacity-50 transition-colors"
            >
              {isSyncingHist ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
              Sincronizar 30 dias
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
          </div>
        </>
      ) : (
        <>
          {discovered.length === 0 ? (
            <div className="text-center py-4">
              <button
                type="button"
                onClick={handleSearch}
                disabled={anyLoading}
                className="inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar contas Instagram disponíveis
              </button>
              <p className="text-xs text-[#666] mt-2">
                Lista contas IG vinculadas às Pages que o token Meta acessa.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-[#888] font-medium">Selecione uma conta IG:</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                disabled={anyLoading}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00] disabled:opacity-50"
              >
                <option value="">— selecione —</option>
                {discovered.map((a) => (
                  <option key={a.ig_user_id ?? a.page_id} value={a.ig_user_id ?? ''}>
                    @{a.ig_username ?? a.ig_user_id} · via {a.page_name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={anyLoading || !selected}
                  className="inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AtSign className="h-4 w-4" />}
                  Conectar
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={anyLoading}
                  className="inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#222] text-[#ccc] px-4 py-2 rounded-lg hover:bg-[#222] disabled:opacity-50 transition-colors"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Atualizar lista
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-[#666] pt-2">
        Sync automática diária às 03:15 (BRT). Limite de 30 dias por chamada (restrição da API).
      </p>
    </div>
  )
}
