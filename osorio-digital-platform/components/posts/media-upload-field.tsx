'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Film, Link2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  fieldName?: string
}

export function MediaUploadField({ fieldName = 'media_url' }: Props) {
  const [file,        setFile]        = useState<File | null>(null)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [manualUrl,   setManualUrl]   = useState('')
  const [showManual,  setShowManual]  = useState(false)
  const [isDragging,  setIsDragging]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const finalUrl = uploadedUrl || manualUrl
  const isVideo  = file?.type.startsWith('video/')

  async function handleFile(f: File) {
    setFile(f)
    setUploadError('')
    setUploadedUrl('')

    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = f.name.split('.').pop() ?? 'bin'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('post-media')
        .upload(path, f, { cacheControl: '3600', upsert: false })

      if (error) throw error

      const { data } = supabase.storage.from('post-media').getPublicUrl(path)
      setUploadedUrl(data.publicUrl)
    } catch {
      setUploadError('Erro no upload. Insira a URL manualmente se preferir.')
    } finally {
      setUploading(false)
    }
  }

  function clear() {
    setFile(null)
    setPreview(null)
    setUploadedUrl('')
    setUploadError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={fieldName} value={finalUrl} />

      {/* Drop zone */}
      {!file && !showManual && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-[#EACE00] bg-[#EACE00]/5'
              : 'border-[#333] bg-[#111] hover:border-[#EACE00]/60'
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <Upload className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">
            Arraste aqui ou{' '}
            <span className="text-[#EACE00]">escolha arquivo</span>
          </p>
          <p className="text-white/25 text-xs mt-1">JPG, PNG, GIF, WEBP, MP4, MOV</p>
        </div>
      )}

      {/* Preview do arquivo */}
      {file && (
        <div className="relative rounded-xl overflow-hidden border border-[#333] bg-[#111]">
          {!isVideo && preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full max-h-56 object-cover" />
          )}
          {isVideo && (
            <div className="flex items-center gap-3 p-4">
              <Film className="h-8 w-8 text-white/30 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-white/70 text-sm truncate">{file.name}</p>
                {uploading && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Loader2 className="h-3 w-3 text-[#EACE00] animate-spin" />
                    <span className="text-[#EACE00] text-xs">Fazendo upload...</span>
                  </div>
                )}
                {uploadedUrl && <p className="text-green-400 text-xs mt-1">Upload concluído ✓</p>}
              </div>
            </div>
          )}
          {uploading && !isVideo && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 text-[#EACE00] animate-spin" />
              <span className="text-[#EACE00] text-sm font-medium">Fazendo upload...</span>
            </div>
          )}
          {uploadedUrl && !isVideo && (
            <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-2 py-0.5">
              <span className="text-green-400 text-[10px] font-medium">✓ Upload concluído</span>
            </div>
          )}
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {uploadError && (
        <p className="text-red-400 text-xs">{uploadError}</p>
      )}

      {/* URL manual */}
      {!file && (
        showManual ? (
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg bg-[#1a1a1a] border border-[#333] text-[#ccc] placeholder:text-white/30 text-sm focus:outline-none focus:border-[#EACE00]/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => { setShowManual(false); setManualUrl('') }}
              className="h-9 px-3 rounded-lg border border-white/10 text-white/40 hover:text-white text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <Link2 className="h-3 w-3" />
            Ou inserir URL manualmente
          </button>
        )
      )}
    </div>
  )
}
