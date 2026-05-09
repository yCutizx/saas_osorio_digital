'use client'

import { useFormState } from 'react-dom'
import { useState, useRef } from 'react'
import { AlertCircle, Send, FileEdit, Upload, X, FileText, Image as ImageIcon } from 'lucide-react'
import { createInsightAction, type FormState } from './actions'
import { cn } from '@/lib/utils'

type ClientItem = { id: string; name: string }

interface Props {
  clients: ClientItem[]
}

const INSIGHT_TYPES = [
  { value: 'mercado',      label: 'Análise de Mercado' },
  { value: 'tendencia',    label: 'Tendência' },
  { value: 'benchmark',   label: 'Benchmark' },
  { value: 'performance', label: 'Relatório de Performance' },
  { value: 'oportunidade',label: 'Oportunidade' },
  { value: 'alerta',      label: 'Alerta' },
  { value: 'dica',        label: 'Dica Estratégica' },
]

const SELECT_CLS = 'w-full h-10 px-3 rounded-lg bg-[#111] border border-[#222] text-[#ccc] text-sm focus:outline-none focus:border-[#EACE00]/60 transition-colors [color-scheme:dark]'
const INPUT_CLS  = 'w-full h-10 px-3 rounded-lg bg-[#111] border border-[#222] text-[#ccc] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#EACE00]/60 transition-colors'
const LABEL_CLS  = 'text-[10px] font-semibold text-white/40 uppercase tracking-wider'

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

function FileUploadField({
  name, label, accept, hint, icon: Icon,
}: {
  name: string; label: string; accept: string; hint: string; icon: React.ElementType
}) {
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1.5">
      <label className={LABEL_CLS}>{label}</label>
      <input ref={inputRef} type="file" name={name} accept={accept}
        className="sr-only"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-[#333] bg-[#111] hover:border-[#EACE00]/40 transition-colors cursor-pointer"
      >
        <Icon className="h-5 w-5 text-white/30 shrink-0" />
        <div className="flex-1 min-w-0">
          {file ? (
            <p className="text-sm text-white truncate">{file.name}</p>
          ) : (
            <p className="text-sm text-white/30">{hint}</p>
          )}
        </div>
        {file ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
            className="text-white/30 hover:text-red-400 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <Upload className="h-4 w-4 text-white/30 shrink-0" />
        )}
      </div>
    </div>
  )
}

export function NewInsightForm({ clients }: Props) {
  const [state, action] = useFormState<FormState, FormData>(createInsightAction, {})
  const [content, setContent] = useState('')
  const [tags,    setTags]    = useState('')
  const statusRef = useRef<HTMLInputElement>(null)

  const previewTags = tags.split(/[\s,]+/).filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')

  return (
    <form action={action} className="space-y-6">
      <input ref={statusRef} type="hidden" name="status" defaultValue="draft" />

      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <label htmlFor="title" className={LABEL_CLS}>Título <span className="text-red-400">*</span></label>
        <input id="title" name="title" required placeholder="Título do insight"
          className={INPUT_CLS} />
        <FieldError messages={state.errors?.title} />
      </div>

      {/* Tipo + Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="type" className={LABEL_CLS}>Tipo</label>
          <select id="type" name="type" className={SELECT_CLS}>
            <option value="">Selecione um tipo...</option>
            {INSIGHT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="client_id" className={LABEL_CLS}>Cliente vinculado</label>
          <select id="client_id" name="client_id" className={SELECT_CLS}>
            <option value="">Geral (todos os clientes)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="content" className={LABEL_CLS}>Conteúdo <span className="text-red-400">*</span></label>
          <span className={cn('text-xs', content.length > 4000 ? 'text-red-400' : 'text-white/30')}>
            {content.length}/5000
          </span>
        </div>
        <textarea
          id="content" name="content" required rows={8}
          placeholder="Escreva o conteúdo completo do insight aqui..."
          value={content} onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-[#111] border border-[#222] text-[#ccc] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#EACE00]/60 transition-colors resize-none"
        />
        <FieldError messages={state.errors?.content} />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label htmlFor="tags_raw" className={LABEL_CLS}>
          Tags <span className="text-white/30 font-normal normal-case">separadas por vírgula</span>
        </label>
        <input id="tags_raw" name="tags_raw"
          placeholder="marketing, tendências, social media"
          value={tags} onChange={(e) => setTags(e.target.value)}
          className={INPUT_CLS} />
        {previewTags && (
          <p className="text-[#EACE00]/60 text-xs">{previewTags}</p>
        )}
      </div>

      {/* Uploads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileUploadField
          name="cover_file"
          label="Imagem de Capa"
          accept="image/*"
          hint="Clique para selecionar imagem..."
          icon={ImageIcon}
        />
        <FileUploadField
          name="doc_file"
          label="Arquivo PDF / Documento"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
          hint="PDF, Word, PowerPoint..."
          icon={FileText}
        />
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#222]">
        <button
          type="submit"
          onClick={() => { if (statusRef.current) statusRef.current.value = 'draft' }}
          className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white text-sm font-medium transition-colors"
        >
          <FileEdit className="h-4 w-4" />
          Salvar Rascunho
        </button>
        <button
          type="submit"
          onClick={() => { if (statusRef.current) statusRef.current.value = 'published' }}
          className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#f5d800] transition-colors"
        >
          <Send className="h-4 w-4" />
          Publicar
        </button>
      </div>
    </form>
  )
}
