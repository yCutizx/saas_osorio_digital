'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { regeneratePipelineTokenAction } from '@/app/actions/pipeline'

interface Props {
  pipelineId: string
  webhookToken: string
}

export function WebhookSection({ pipelineId, webhookToken }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [token, setToken] = useState(webhookToken)
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/api/pipeline/inbound/${token}`
    : `/api/pipeline/inbound/${token}`

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success('URL copiada')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRegenerate() {
    if (!confirm('Regenerar o token vai invalidar o anterior. Integrações que usam a URL atual deixarão de funcionar. Continuar?')) return
    startTransition(async () => {
      const result = await regeneratePipelineTokenAction(pipelineId)
      if (result.error) { toast.error(result.error); return }
      if (result.token) {
        setToken(result.token)
        toast.success('Token regenerado')
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#888]">
        POST nesta URL cria um lead diretamente neste pipeline. Use o token como parte da URL — não envie via header.
      </p>
      <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2">
        <code className="flex-1 text-xs text-white/80 truncate font-mono">{url}</code>
        <button
          onClick={handleCopy}
          className="text-[#888] hover:text-white transition-colors shrink-0"
          title="Copiar URL"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <button
        onClick={handleRegenerate}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333] text-xs text-[#888] hover:text-white hover:border-[#555] transition-colors disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Regenerar token
      </button>

      <details className="bg-[#0a0a0a] border border-[#222] rounded-xl">
        <summary className="cursor-pointer px-3 py-2 text-xs text-white/60 hover:text-white">
          Exemplo de payload (POST)
        </summary>
        <pre className="px-3 pb-3 text-[10px] text-white/50 overflow-x-auto">
{`{
  "name": "João Silva",           // obrigatório
  "company": "ACME Ltda",
  "role": "CEO",
  "email": "joao@acme.com",
  "phone": "11999999999",
  "whatsapp": "5511999999999",
  "source": "site",                // manual | whatsapp | meta_ads | google | indicacao | site | outro
  "estimated_value": 5000,
  "notes": "Veio pelo formulário..."
}`}
        </pre>
      </details>
    </div>
  )
}
