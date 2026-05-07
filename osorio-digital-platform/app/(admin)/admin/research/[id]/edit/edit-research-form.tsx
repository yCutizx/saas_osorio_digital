'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useRef, useState } from 'react'
import { AlertCircle, Loader2, Send, Upload, FileText, X } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateResearchAction, type FormState } from './actions'

type Client = { id: string; name: string }

type Props = {
  research: {
    id: string
    title: string
    description: string | null
    file_url: string
    tags: string[] | null
    client_id: string | null
  }
  clients: Client[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#EACE00]/90 transition-colors disabled:opacity-60"
    >
      {pending
        ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
        : <><Send className="h-4 w-4" />Salvar Alterações</>}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function EditResearchForm({ research, clients }: Props) {
  const [state, action] = useFormState<FormState, FormData>(updateResearchAction, {})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [useExternalUrl, setUseExternalUrl] = useState(false)

  const isStorageUrl = research.file_url.includes('supabase')

  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      <input type="hidden" name="id" value={research.id} />
      <input type="hidden" name="keep_file_url" value={research.file_url} />

      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Título <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          defaultValue={research.title}
          placeholder="Nome da pesquisa de mercado"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
        />
        <FieldError messages={state.errors?.title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Descrição <span className="text-white/30 font-normal text-xs">(opcional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={research.description ?? ''}
          placeholder="Breve descrição do conteúdo da pesquisa..."
          rows={3}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 resize-none"
        />
      </div>

      {/* Arquivo atual */}
      <div className="space-y-3">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Arquivo PDF</Label>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#EACE00]/5 border border-[#EACE00]/20">
          <FileText className="h-5 w-5 text-[#EACE00] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 mb-0.5">Arquivo atual</p>
            <a
              href={research.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#EACE00] hover:underline truncate block"
            >
              {isStorageUrl
                ? decodeURIComponent(research.file_url.split('/').pop() ?? 'arquivo.pdf')
                : research.file_url}
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setUseExternalUrl(false); setSelectedFile(null) }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                !useExternalUrl
                  ? 'bg-[#EACE00]/15 border-[#EACE00]/40 text-[#EACE00]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              Enviar novo PDF
            </button>
            <button
              type="button"
              onClick={() => { setUseExternalUrl(true); setSelectedFile(null) }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                useExternalUrl
                  ? 'bg-[#EACE00]/15 border-[#EACE00]/40 text-[#EACE00]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              Link externo
            </button>
          </div>

          {!useExternalUrl ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                name="pdf_file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <FileText className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-sm text-green-300 flex-1 truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 p-5 rounded-lg border border-dashed border-white/15 hover:border-[#EACE00]/40 hover:bg-[#EACE00]/5 transition-colors"
                >
                  <Upload className="h-6 w-6 text-white/30" />
                  <span className="text-sm text-white/50">
                    Clique para selecionar um novo PDF
                  </span>
                  <span className="text-xs text-white/30">Máximo 50 MB · Deixe vazio para manter o atual</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input
                name="file_url"
                type="url"
                placeholder="https://drive.google.com/..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
              />
              <FieldError messages={state.errors?.file_url} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client_id" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Cliente <span className="text-white/30 font-normal text-xs">(deixe em branco para todos)</span>
        </Label>
        <select
          id="client_id"
          name="client_id"
          defaultValue={research.client_id ?? ''}
          className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#EACE00]/60 transition-colors"
        >
          <option value="">Todos os clientes Premium</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <FieldError messages={state.errors?.client_id} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tags_raw" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Tags <span className="text-white/30 font-normal text-xs">(separadas por vírgula)</span>
        </Label>
        <Input
          id="tags_raw"
          name="tags_raw"
          defaultValue={(research.tags ?? []).join(', ')}
          placeholder="e-commerce, comportamento do consumidor"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
        />
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
