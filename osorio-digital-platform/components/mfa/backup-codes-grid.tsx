'use client'

import { useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'

interface BackupCodesGridProps {
  codes: string[]
}

export function BackupCodesGrid({ codes }: BackupCodesGridProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyAll() {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const content = [
      'Osório Digital — Códigos de Backup MFA',
      'Guarde estes códigos em um lugar seguro.',
      'Cada código pode ser usado apenas uma vez.',
      '',
      ...codes,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'osorio-digital-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {codes.map((code) => (
          <div
            key={code}
            className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-center font-mono text-sm text-white tracking-wider"
          >
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopyAll}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-[#333] text-[#888] hover:text-white rounded-xl text-sm transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copiado!' : 'Copiar todos'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-[#333] text-[#888] hover:text-white rounded-xl text-sm transition-colors"
        >
          <Download className="h-4 w-4" />
          Baixar .txt
        </button>
      </div>
    </div>
  )
}
