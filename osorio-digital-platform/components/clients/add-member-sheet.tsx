'use client'

import { useState, useTransition, useEffect } from 'react'
import { Loader2, AlertCircle, UserPlus, Link2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  listAvailableProfilesAction,
  addExistingMemberAction,
  createAndAddMemberAction,
} from '@/app/actions/client-members'

interface AvailableProfile {
  id:        string
  full_name: string | null
  email:     string
}

interface Props {
  clientId: string
  /** Estado externo de disabled — usado quando atinge limite máximo */
  disabled?: boolean
  /** Texto de tooltip exibido em hover quando disabled */
  disabledTooltip?: string
}

type Tab = 'existing' | 'new'

export function AddMemberSheet({ clientId, disabled, disabledTooltip }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState<Tab>('existing')

  // Existing tab state
  const [available, setAvailable]       = useState<AvailableProfile[]>([])
  const [search, setSearch]             = useState('')
  const [selectedId, setSelectedId]     = useState('')
  const [loadingList, setLoadingList]   = useState(false)
  const [errorExisting, setErrorExisting] = useState<string | null>(null)
  const [pendingLink, startLink]        = useTransition()

  // New tab state
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [errorNew, setErrorNew] = useState<string | null>(null)
  const [pendingCreate, startCreate] = useTransition()

  // Lazy load lista quando abre + aba "existing" ativa
  useEffect(() => {
    if (!open || tab !== 'existing' || loadingList || available.length > 0) return
    setLoadingList(true)
    listAvailableProfilesAction(clientId).then((r) => {
      setLoadingList(false)
      if ('error' in r) {
        setErrorExisting(r.error ?? 'Erro ao listar')
        return
      }
      setAvailable(r.profiles as AvailableProfile[])
    })
  }, [open, tab, loadingList, available.length, clientId])

  function handleLink() {
    setErrorExisting(null)
    if (!selectedId) { setErrorExisting('Selecione um usuário'); return }
    startLink(async () => {
      const r = await addExistingMemberAction({ clientId, userId: selectedId })
      if ('error' in r) { setErrorExisting(r.error ?? 'Erro ao vincular'); return }
      toast.success('Membro vinculado')
      setOpen(false)
      setSelectedId('')
      setAvailable([])
    })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setErrorNew(null)
    startCreate(async () => {
      const r = await createAndAddMemberAction({ clientId, fullName, email, password })
      if ('error' in r) { setErrorNew(r.error ?? 'Erro ao criar'); return }
      toast.success('Membro criado e vinculado. Compartilhe as credenciais manualmente com o cliente.')
      setOpen(false)
      setFullName('')
      setEmail('')
      setPassword('')
    })
  }

  const filteredAvailable = available.filter((p) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (p.full_name ?? '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        disabled={disabled}
        title={disabled ? disabledTooltip : undefined}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
          disabled
            ? 'bg-[#222] text-[#666] cursor-not-allowed'
            : 'bg-[#EACE00] text-black hover:bg-[#f5d800]',
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar membro
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0A0A0A] border-l border-[#222] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#EACE00]" />
            Adicionar membro
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-5 inline-flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-1 w-full">
          <TabBtn active={tab === 'existing'} onClick={() => setTab('existing')}>
            <Link2 className="h-3.5 w-3.5" />
            Vincular existente
          </TabBtn>
          <TabBtn active={tab === 'new'} onClick={() => setTab('new')}>
            <Plus className="h-3.5 w-3.5" />
            Criar novo
          </TabBtn>
        </div>

        {/* Existing tab */}
        {tab === 'existing' && (
          <div className="mt-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loadingList || pendingLink}
                placeholder="Buscar por nome ou email…"
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
              />
            </div>

            <div className="rounded-lg border border-[#222] max-h-72 overflow-y-auto">
              {loadingList ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#888]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando…
                </div>
              ) : filteredAvailable.length === 0 ? (
                <p className="text-sm text-[#888] py-6 text-center px-4">
                  Nenhum usuário disponível.
                  <span className="block text-xs text-[#666] mt-1">Use a aba &quot;Criar novo&quot; pra cadastrar.</span>
                </p>
              ) : (
                <ul className="divide-y divide-[#222]">
                  {filteredAvailable.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        disabled={pendingLink}
                        className={cn(
                          'w-full text-left px-3 py-2.5 transition-colors disabled:opacity-50',
                          selectedId === p.id ? 'bg-[#EACE00]/10' : 'hover:bg-[#111]',
                        )}
                      >
                        <p className="text-sm text-white font-medium truncate">{p.full_name ?? '—'}</p>
                        <p className="text-xs text-[#888] truncate">{p.email}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {errorExisting && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorExisting}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pendingLink}
                className="flex-1 px-4 py-2 rounded-lg border border-[#222] text-[#888] hover:bg-[#111] text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLink}
                disabled={pendingLink || !selectedId}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
              >
                {pendingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Vincular
              </button>
            </div>
          </div>
        )}

        {/* New tab */}
        {tab === 'new' && (
          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <Field label="Nome completo" htmlFor="full-name">
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={pendingCreate}
                maxLength={120}
                placeholder="Andre Monan"
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
              />
            </Field>

            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pendingCreate}
                maxLength={200}
                placeholder="andre@monan.com.br"
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
              />
            </Field>

            <Field label="Senha temporária" htmlFor="password" hint="Mínimo 8 caracteres. Compartilhe manualmente com o cliente (ex: via WhatsApp).">
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={pendingCreate}
                placeholder="Ex: monan2026"
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50 font-mono"
              />
            </Field>

            {errorNew && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorNew}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pendingCreate}
                className="flex-1 px-4 py-2 rounded-lg border border-[#222] text-[#888] hover:bg-[#111] text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pendingCreate}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
              >
                {pendingCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Criar e vincular
              </button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-[#EACE00] text-black' : 'text-white/50 hover:text-white hover:bg-white/5',
      )}
    >
      {children}
    </button>
  )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs text-[#888] font-medium uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#666]">{hint}</p>}
    </div>
  )
}
