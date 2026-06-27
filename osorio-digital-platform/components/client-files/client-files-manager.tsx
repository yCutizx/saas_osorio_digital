'use client'

import { useRef, useState } from 'react'
import {
  UploadCloud, Download, Trash2, Loader2, File, FileText, Film, Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  createUploadUrlAction, registerFileAction,
  getFileDownloadUrlAction, deleteFileAction,
} from '@/app/actions/client-files'

const BUCKET = 'client-files'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export type ClientFile = {
  id:          string
  file_name:   string
  file_path:   string
  file_size:   number
  file_type:   string | null
  created_at:  string
  uploaded_by?: string | null
  client_id?:  string
}

interface Props {
  clientId:     string
  initialFiles: ClientFile[]
}

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

export function ClientFilesManager({ clientId, initialFiles }: Props) {
  const [files, setFiles]           = useState<ClientFile[]>(initialFiles)
  const [uploading, setUploading]   = useState(false)
  const [uploadLabel, setUploadLabel] = useState<string | null>(null)
  const [dragOver, setDragOver]     = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(list: File[]) {
    if (uploading || list.length === 0) return

    const valid: File[] = []
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} excede 50 MB`)
        continue
      }
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

        const reg = await registerFileAction(clientId, up.path, file.name, file.size, file.type)
        if ('error' in reg) { toast.error(reg.error ?? 'Falha ao registrar arquivo'); continue }

        setFiles((prev) => [reg.file as ClientFile, ...prev])
        toast.success(`${file.name} enviado`)
      } catch {
        toast.error(`Erro inesperado no upload de ${file.name}`)
      }
    }

    setUploading(false)
    setUploadLabel(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDownload(file: ClientFile) {
    if (downloadingId) return
    setDownloadingId(file.id)
    try {
      const r = await getFileDownloadUrlAction(file.id)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao baixar'); return }
      const a = document.createElement('a')
      a.href = r.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(file: ClientFile) {
    if (deletingId) return
    if (!confirm(`Remover "${file.file_name}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(file.id)
    try {
      const r = await deleteFileAction(file.id)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao remover'); return }
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      toast.success('Arquivo removido')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
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
          ref={fileRef}
          type="file"
          multiple
          className="sr-only"
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
            <p className="text-white/25 text-xs mt-1">Até 50 MB por arquivo</p>
          </>
        )}
      </div>

      {/* Lista */}
      {files.length === 0 ? (
        <p className="text-center text-[#888] text-sm py-6">Nenhum arquivo ainda</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => {
            const downloading = downloadingId === file.id
            const deleting    = deletingId === file.id
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2.5 bg-[#0a0a0a] border border-[#222] rounded-lg group"
              >
                <FileTypeIcon type={file.file_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{file.file_name}</p>
                  <p className="text-xs text-white/30">
                    {formatSize(file.file_size)} ·{' '}
                    {new Date(file.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  disabled={downloading || deleting}
                  aria-label="Baixar"
                  className="text-white/30 hover:text-[#EACE00] transition-colors shrink-0 disabled:opacity-40"
                >
                  {downloading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  disabled={downloading || deleting}
                  aria-label="Remover"
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all shrink-0 disabled:opacity-40"
                >
                  {deleting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
