import Link from 'next/link'
import {
  StickyNote, FolderOpen, ArrowRight, File, FileText, Film, Image as ImageIcon,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

type NoteRow = {
  id:         string
  content:    string
  created_at: string
  author:     { full_name: string | null; email: string | null } | null
}

type FileRow = {
  id:         string
  file_name:  string
  file_size:  number
  file_type:  string | null
  created_at: string
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
  return <File className={`${cls} text-white/40`} />
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function ClientSpaceOverviewPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient()
  const base  = `/admin/clients/${params.id}/space`

  const [{ data: rawNotes }, { data: rawFiles }] = await Promise.all([
    admin
      .from('client_notes')
      .select('id, content, created_at, author:author_id(full_name, email)')
      .eq('client_id', params.id)
      .order('created_at', { ascending: false })
      .limit(3),
    admin
      .from('client_files')
      .select('id, file_name, file_size, file_type, created_at')
      .eq('client_id', params.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const notes = (rawNotes ?? []) as unknown as NoteRow[]
  const files = (rawFiles ?? []) as unknown as FileRow[]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Notas recentes */}
      <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-[#EACE00]" />
            <h3 className="text-sm font-semibold text-[#F5F5F0]">Notas recentes</h3>
          </div>
          <Link
            href={`${base}/notes`}
            className="inline-flex items-center gap-1 text-xs text-[#888] hover:text-[#EACE00] transition-colors"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-[#888] py-6 text-center">Nenhuma nota ainda</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => {
              const author = n.author?.full_name ?? n.author?.email ?? 'Desconhecido'
              return (
                <div key={n.id} className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3">
                  <p className="text-sm text-white/70 line-clamp-2 whitespace-pre-wrap break-words">{n.content}</p>
                  <p className="text-xs text-white/30 mt-1.5">{author} · {fmtDate(n.created_at)}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Arquivos recentes */}
      <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-[#EACE00]" />
            <h3 className="text-sm font-semibold text-[#F5F5F0]">Arquivos recentes</h3>
          </div>
          <Link
            href={`${base}/files`}
            className="inline-flex items-center gap-1 text-xs text-[#888] hover:text-[#EACE00] transition-colors"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-[#888] py-6 text-center">Nenhum arquivo ainda</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-[#0a0a0a] border border-[#222] rounded-lg p-3">
                <FileTypeIcon type={f.file_type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80 truncate">{f.file_name}</p>
                  <p className="text-xs text-white/30">{formatSize(f.file_size)} · {fmtDate(f.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export const dynamic = 'force-dynamic'
