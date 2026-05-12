'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import Image from 'next/image'

interface QrCodeDisplayProps {
  qrCodeDataUrl: string
  manualEntryKey: string
}

export function QrCodeDisplay({ qrCodeDataUrl, manualEntryKey }: QrCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(manualEntryKey.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-3 rounded-2xl">
        <Image src={qrCodeDataUrl} alt="QR Code MFA" width={200} height={200} unoptimized />
      </div>

      <div className="w-full">
        <p className="text-[#888] text-xs text-center mb-2">
          Sem câmera? Digite a chave manualmente:
        </p>
        <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-xl px-3 py-2">
          <code className="flex-1 text-[#EACE00] text-xs font-mono tracking-widest break-all">
            {manualEntryKey}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[#555] hover:text-white transition-colors shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
