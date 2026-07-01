'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UploadCloud, Download, Trash2, Loader2, File, FileText, Film, Image as ImageIcon,
  Folder, FolderPlus, MoreHorizontal, Pencil, FolderInput, CornerLeftUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  createUploadUrlAction, registerFileAction,
  getFileDownloadUrlAction, deleteFileAction, moveFileAction,
} from '@/app/actions/client-files'
import {
  createFolderAction, renameFolderAction, deleteFolderAction,
  moveFolderAction, listAllFoldersAction,
} from '@/app/actions/client-folders'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { FilesBreadcrumb, type Crumb } from './files-breadcrumb'

const BUCKET = 'client-files'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export type ClientFile = {
  id:          string
  file_name:   string
  file_path:   string
  file_size:   number
  file_type:   string | null
  folder_id?:  string | null
  created_at:  string
  uploaded_by?: string | null
  client_id?:  string
}

export type ClientFolder = {
  id:         string
  name:       string
  parent_id:  string | null
  created_at?: string
}

interface Props {
  clientId:       string
  folderId:       string | null
  breadcrumb:     Crumb[]
  initialFolders: ClientFolder[]
  initialFiles:   ClientFile[]
}

const ITEM_CLS = 'gap-2 px-3 py-2 rounded-lg text-[#F5F5F0] cursor-pointer focus:bg-[#1a1a1a] focus:text-white'
const ITEM_DANGER = 'gap-2 px-3 py-2 rounded-lg text-red-400 cursor-pointer focus:bg-red-500/10 focus:text-red-400'
const MENU_CLS = 'min-w-[160px] bg-[#111] border border-[#222] p-1'

function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

function FileTypeIcon({ type }: { type: string | null }) {
  const cls = 'h-4 w-4 shrink-0'
  if (!type) return <File className={`${cls} text-white/40`} />
  if (type.startsWith('image/')) return <ImageIcon className={`${cls} text-blue-400`} />
  if (type.startsWith('video/')) return <Film className={`${cls} text-purple-400`} />
  if (type.includes('pdf')) return <FileText className={`${cls} text-red-400`} />
  if (type.includes('word') || type.includes('document') || type.includes('sheet') || type.includes('excel'))
    return <FileText className={`${cls} text-green-400`} />
  return <File className={`${cls} text-white/40`} />
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Modal: nome (criar/renomear pasta) ──────────────────────────────────────
function NameModal({ title, initial, submitLabel, onClose, onSubmit }: {
  title: string; initial: string; submitLabel: string
  onClose: () => void; onSubmit: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy || !name.trim()) return
    setBusy(true)
    try { await onSubmit(name.trim()) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold text-base mb-4">{title}</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={100}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
          placeholder="Nome da pasta"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] placeholder-[#555] focus:outline-none focus:border-[#EACE00]/60"
        />
        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onClose} disabled={busy}
            className="flex-1 py-2 border border-[#222] text-[#888] rounded-lg text-sm hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={submit} disabled={busy || !name.trim()}
            className="flex-1 py-2 bg-[#EACE00] text-black font-semibold rounded-lg text-sm hover:bg-[#f5d800] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: mover para (seletor de pasta destino) ────────────────────────────
function MoveModal({ clientId, title, currentParentId, excludeFolderId, onClose, onPick }: {
  clientId: string
  title: string
  currentParentId: string | null       // pasta atual do item (pra desabilitar "onde já está")
  excludeFolderId?: string             // ao mover PASTA: exclui ela e descendentes
  onClose: () => void
  onPick: (destId: string | null) => Promise<void>
}) {
  const [folders, setFolders] = useState<{ id: string; name: string; parent_id: string | null }[] | null>(null)
  const [busy, setBusy]       = useState(false)

  useEffect(() => {
    listAllFoldersAction(clientId).then((r) => {
      if ('error' in r) { toast.error(r.error ?? 'Falha ao carregar pastas'); setFolders([]) }
      else setFolders(r.folders)
    })
  }, [clientId])

  async function pick(destId: string | null) {
    if (busy) return
    setBusy(true)
    try { await onPick(destId) } finally { setBusy(false) }
  }

  // Exclui a própria pasta + descendentes (só relevante no move de pasta)
  const excluded = new Set<string>()
  if (folders && excludeFolderId) {
    const childrenBy = new Map<string | null, string[]>()
    for (const f of folders) {
      const a = childrenBy.get(f.parent_id) ?? []
      a.push(f.id); childrenBy.set(f.parent_id, a)
    }
    const stack = [excludeFolderId]
    excluded.add(excludeFolderId)
    while (stack.length) {
      const id = stack.pop() as string
      for (const c of childrenBy.get(id) ?? []) if (!excluded.has(c)) { excluded.add(c); stack.push(c) }
    }
  }

  // Ordena em árvore com indentação por profundidade
  const rows: { id: string; name: string; depth: number }[] = []
  if (folders) {
    const childrenBy = new Map<string | null, { id: string; name: string; parent_id: string | null }[]>()
    for (const f of folders) {
      const a = childrenBy.get(f.parent_id) ?? []
      a.push(f); childrenBy.set(f.parent_id, a)
    }
    for (const [, a] of childrenBy) a.sort((x, y) => x.name.localeCompare(y.name))
    const walk = (parentId: string | null, depth: number) => {
      for (const f of childrenBy.get(parentId) ?? []) {
        if (excluded.has(f.id)) continue
        rows.push({ id: f.id, name: f.name, depth })
        walk(f.id, depth + 1)
      }
    }
    walk(null, 0)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold text-base mb-3">{title}</h3>

        {folders === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 text-[#EACE00] animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
            {/* Raiz */}
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={busy || currentParentId === null}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#F5F5F0] hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
            >
              <CornerLeftUp className="h-4 w-4 text-[#888] shrink-0" />
              Raiz {currentParentId === null && <span className="text-[10px] text-white/30">(atual)</span>}
            </button>

            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pick(r.id)}
                disabled={busy || currentParentId === r.id}
                style={{ paddingLeft: `${12 + r.depth * 16}px` }}
                className="w-full flex items-center gap-2 pr-3 py-2 rounded-lg text-sm text-[#F5F5F0] hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
              >
                <Folder className="h-4 w-4 text-[#EACE00] shrink-0" />
                <span className="truncate">{r.name}</span>
                {currentParentId === r.id && <span className="text-[10px] text-white/30 shrink-0">(atual)</span>}
              </button>
            ))}

            {rows.length === 0 && (
              <p className="text-center text-[#888] text-sm py-6">Nenhuma outra pasta</p>
            )}
          </div>
        )}

        <div className="pt-4">
          <button type="button" onClick={onClose} disabled={busy}
            className="w-full py-2 border border-[#222] text-[#888] rounded-lg text-sm hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Manager ─────────────────────────────────────────────────────────────────
export function ClientFilesManager({ clientId, folderId, breadcrumb, initialFolders, initialFiles }: Props) {
  const router = useRouter()
  const base   = `/admin/clients/${clientId}/space/files`

  const [folders, setFolders]       = useState<ClientFolder[]>(initialFolders)
  const [files, setFiles]           = useState<ClientFile[]>(initialFiles)
  const [uploading, setUploading]   = useState(false)
  const [uploadLabel, setUploadLabel] = useState<string | null>(null)
  const [dragOver, setDragOver]     = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [busyId, setBusyId]         = useState<string | null>(null) // pasta/arquivo em mutação
  const fileRef = useRef<HTMLInputElement>(null)

  const [showCreate, setShowCreate]     = useState(false)
  const [renameTarget, setRenameTarget] = useState<ClientFolder | null>(null)
  const [moveTarget, setMoveTarget]     = useState<
    { kind: 'file' | 'folder'; id: string; name: string; parentId: string | null } | null
  >(null)

  function navigate(id: string) {
    router.push(`${base}/${id}`)
  }

  // ── Upload (fluxo signed-URL intacto; só ganha folderId no register) ──
  async function handleFiles(list: File[]) {
    if (uploading || list.length === 0) return

    const valid: File[] = []
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name} excede 50 MB`); continue }
      valid.push(f)
    }
    if (valid.length === 0) return

    setUploading(true)
    const supabase = createClient()

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i]
      setUploadLabel(valid.length > 1 ? `Enviando ${i + 1} de ${valid.length}...` : 'Enviando...')
      try {
        const up = await createUploadUrlAction(clientId, file.name, file.type)
        if ('error' in up) { toast.error(up.error ?? 'Falha ao preparar upload'); continue }

        const { error: putErr } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(up.path, up.token, file)
        if (putErr) { toast.error(`Falha no upload de ${file.name}`); continue }

        const reg = await registerFileAction(clientId, up.path, file.name, file.size, file.type, folderId)
        if ('error' in reg) { toast.error(reg.error ?? 'Falha ao registrar arquivo'); continue }

        setFiles((prev) => [reg.file as unknown as ClientFile, ...prev])
        toast.success(`${file.name} enviado`)
      } catch {
        toast.error(`Erro inesperado no upload de ${file.name}`)
      }
    }

    setUploading(false)
    setUploadLabel(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Pastas ──
  async function handleCreateFolder(name: string) {
    const r = await createFolderAction(clientId, name, folderId)
    if ('error' in r) { toast.error(r.error ?? 'Falha ao criar pasta'); return }
    setFolders((prev) => [...prev, r.folder as unknown as ClientFolder]
      .sort((a, b) => a.name.localeCompare(b.name)))
    setShowCreate(false)
    toast.success('Pasta criada')
  }

  async function handleRenameFolder(folder: ClientFolder, name: string) {
    const r = await renameFolderAction(folder.id, name)
    if ('error' in r) { toast.error(r.error ?? 'Falha ao renomear'); return }
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? (r.folder as unknown as ClientFolder) : f))
      .sort((a, b) => a.name.localeCompare(b.name)))
    setRenameTarget(null)
    toast.success('Pasta renomeada')
  }

  async function handleDeleteFolder(folder: ClientFolder) {
    if (busyId) return
    if (!confirm(`Apagar a pasta "${folder.name}"?\n\nIsso remove a pasta e TUDO dentro dela (subpastas e arquivos). Não pode ser desfeito.`)) return
    setBusyId(folder.id)
    try {
      const r = await deleteFolderAction(folder.id)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao apagar pasta'); return }
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
      const n = r.deletedFiles
      toast.success(`Pasta removida${n > 0 ? ` (${n} arquivo${n === 1 ? '' : 's'})` : ''}`)
    } finally {
      setBusyId(null)
    }
  }

  async function handleMoveFolder(folderId2: string, destId: string | null) {
    setBusyId(folderId2)
    try {
      const r = await moveFolderAction(folderId2, destId)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao mover'); return }
      setFolders((prev) => prev.filter((f) => f.id !== folderId2)) // saiu desta pasta
      setMoveTarget(null)
      toast.success('Pasta movida')
    } finally {
      setBusyId(null)
    }
  }

  // ── Arquivos ──
  async function handleDownload(file: ClientFile) {
    if (downloadingId) return
    setDownloadingId(file.id)
    try {
      const r = await getFileDownloadUrlAction(file.id)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao baixar'); return }
      const a = document.createElement('a')
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer'
      document.body.appendChild(a); a.click(); a.remove()
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDeleteFile(file: ClientFile) {
    if (busyId) return
    if (!confirm(`Remover "${file.file_name}"? Esta ação não pode ser desfeita.`)) return
    setBusyId(file.id)
    try {
      const r = await deleteFileAction(file.id)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao remover'); return }
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      toast.success('Arquivo removido')
    } finally {
      setBusyId(null)
    }
  }

  async function handleMoveFile(fileId: string, destId: string | null) {
    setBusyId(fileId)
    try {
      const r = await moveFileAction(fileId, destId)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao mover'); return }
      setFiles((prev) => prev.filter((f) => f.id !== fileId)) // saiu desta pasta
      setMoveTarget(null)
      toast.success('Arquivo movido')
    } finally {
      setBusyId(null)
    }
  }

  const empty = folders.length === 0 && files.length === 0

  return (
    <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
      {/* a) Breadcrumb */}
      <FilesBreadcrumb clientId={clientId} breadcrumb={breadcrumb} />

      {/* b) Barra de ações + drop zone */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 bg-[#1a1a1a] border border-[#222] text-[#ccc] text-sm px-3 py-1.5 rounded-lg hover:bg-[#222] hover:text-white transition-colors"
        >
          <FolderPlus className="h-4 w-4 text-[#EACE00]" />
          Nova pasta
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (uploading) return
          const dropped = Array.from(e.dataTransfer.files)
          if (dropped.length) handleFiles(dropped)
        }}
        onClick={() => { if (!uploading) fileRef.current?.click() }}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
          uploading
            ? 'border-[#222] bg-[#0a0a0a] cursor-default'
            : dragOver
              ? 'border-[#EACE00] bg-[#EACE00]/5 cursor-pointer'
              : 'border-[#333] bg-[#0a0a0a] hover:border-[#EACE00]/60 cursor-pointer',
        )}
      >
        <input
          ref={fileRef} type="file" multiple className="sr-only"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? [])
            if (selected.length) handleFiles(selected)
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <Loader2 className="h-5 w-5 text-[#EACE00] animate-spin" />
            <span className="text-[#EACE00] text-sm font-medium">{uploadLabel ?? 'Enviando...'}</span>
          </div>
        ) : (
          <>
            <UploadCloud className="h-7 w-7 text-white/20 mx-auto mb-2" />
            <p className="text-white/50 text-sm">
              Arraste arquivos ou <span className="text-[#EACE00]">clique pra enviar</span>
            </p>
            <p className="text-white/25 text-xs mt-1">Envia para a pasta atual · até 50 MB por arquivo</p>
          </>
        )}
      </div>

      {/* c/d) Pastas + arquivos */}
      {empty ? (
        <p className="text-center text-[#888] text-sm py-6">Pasta vazia</p>
      ) : (
        <div className="space-y-1.5">
          {/* Pastas primeiro */}
          {folders.map((f) => {
            const busy = busyId === f.id
            return (
              <div
                key={f.id}
                onClick={() => { if (!busy) navigate(f.id) }}
                className="flex items-center gap-3 p-2.5 bg-[#0a0a0a] border border-[#222] rounded-lg group hover:border-[#333] cursor-pointer"
              >
                <Folder className="h-4 w-4 text-[#EACE00] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{f.name}</p>
                </div>
                {busy && <Loader2 className="h-4 w-4 animate-spin text-white/40 shrink-0" />}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    disabled={busy}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-all shrink-0 outline-none disabled:opacity-30"
                    aria-label="Ações da pasta"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={MENU_CLS}>
                    <DropdownMenuItem className={ITEM_CLS} onClick={() => setRenameTarget(f)}>
                      <Pencil className="h-4 w-4 text-[#888]" /> Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={ITEM_CLS}
                      onClick={() => setMoveTarget({ kind: 'folder', id: f.id, name: f.name, parentId: f.parent_id })}
                    >
                      <FolderInput className="h-4 w-4 text-[#888]" /> Mover
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#222] my-1" />
                    <DropdownMenuItem className={ITEM_DANGER} onClick={() => handleDeleteFolder(f)}>
                      <Trash2 className="h-4 w-4" /> Apagar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}

          {/* Arquivos */}
          {files.map((file) => {
            const downloading = downloadingId === file.id
            const busy        = busyId === file.id
            return (
              <div key={file.id} className="flex items-center gap-3 p-2.5 bg-[#0a0a0a] border border-[#222] rounded-lg group">
                <FileTypeIcon type={file.file_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{file.file_name}</p>
                  <p className="text-xs text-white/30">{formatSize(file.file_size)} · {fmtDate(file.created_at)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  disabled={downloading || busy}
                  aria-label="Baixar"
                  className="text-white/30 hover:text-[#EACE00] transition-colors shrink-0 disabled:opacity-40"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </button>

                {busy && <Loader2 className="h-4 w-4 animate-spin text-white/40 shrink-0" />}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={busy}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-all shrink-0 outline-none disabled:opacity-30"
                    aria-label="Ações do arquivo"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={MENU_CLS}>
                    <DropdownMenuItem className={ITEM_CLS} onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4 text-[#888]" /> Baixar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={ITEM_CLS}
                      onClick={() => setMoveTarget({ kind: 'file', id: file.id, name: file.file_name, parentId: file.folder_id ?? null })}
                    >
                      <FolderInput className="h-4 w-4 text-[#888]" /> Mover
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#222] my-1" />
                    <DropdownMenuItem className={ITEM_DANGER} onClick={() => handleDeleteFile(file)}>
                      <Trash2 className="h-4 w-4" /> Apagar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}

      {/* Modais */}
      {showCreate && (
        <NameModal
          title="Nova pasta"
          initial=""
          submitLabel="Criar"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateFolder}
        />
      )}

      {renameTarget && (
        <NameModal
          title="Renomear pasta"
          initial={renameTarget.name}
          submitLabel="Salvar"
          onClose={() => setRenameTarget(null)}
          onSubmit={(name) => handleRenameFolder(renameTarget, name)}
        />
      )}

      {moveTarget && (
        <MoveModal
          clientId={clientId}
          title={`Mover "${moveTarget.name}" para`}
          currentParentId={moveTarget.parentId}
          excludeFolderId={moveTarget.kind === 'folder' ? moveTarget.id : undefined}
          onClose={() => setMoveTarget(null)}
          onPick={(destId) =>
            moveTarget.kind === 'folder'
              ? handleMoveFolder(moveTarget.id, destId)
              : handleMoveFile(moveTarget.id, destId)
          }
        />
      )}
    </section>
  )
}
