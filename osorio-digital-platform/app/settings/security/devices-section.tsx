'use client'

import { useState }              from 'react'
import { toast }                 from 'sonner'
import { revokeTrustedDevice }   from '@/app/(auth)/mfa/actions'
import { Card }                  from '@/components/ui/card'
import { Button }                from '@/components/ui/button'
import { Monitor, Smartphone, X, Loader2 } from 'lucide-react'
import { formatDistanceToNow }   from 'date-fns'
import { ptBR }                  from 'date-fns/locale'

interface Device {
  id:           string
  device_name:  string
  last_used_at: string
  expires_at:   string
}

interface Props {
  initialDevices: Device[]
}

export function DevicesSection({ initialDevices }: Props) {
  const [devices, setDevices]     = useState(initialDevices)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handleRevoke(id: string) {
    setRevokingId(id)
    try {
      const result = await revokeTrustedDevice(id)
      if (result.success) {
        setDevices((prev) => prev.filter((d) => d.id !== id))
        toast.success('Dispositivo revogado')
      } else {
        toast.error('Erro ao revogar dispositivo')
      }
    } catch {
      toast.error('Erro ao revogar dispositivo')
    }
    setRevokingId(null)
  }

  return (
    <Card className="bg-[#111] border-[#222] p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#F5F5F0]">Dispositivos confiáveis</h2>
        <p className="text-sm text-[#888] mt-1">
          Dispositivos onde você marcou &quot;confiar por 30 dias&quot; não precisam de código MFA no login.
        </p>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8 text-sm text-[#666]">
          Nenhum dispositivo confiável.
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => {
            const isMobile = /mobile|android|ios|iphone|ipad/i.test(device.device_name.toLowerCase())
            const Icon = isMobile ? Smartphone : Monitor

            return (
              <div
                key={device.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1a1a1a]"
              >
                <Icon className="h-5 w-5 text-[#888] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F5F5F0] truncate">{device.device_name}</p>
                  <p className="text-xs text-[#666]">
                    Último uso{' '}
                    {formatDistanceToNow(new Date(device.last_used_at), {
                      locale:         ptBR,
                      addSuffix:      true,
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRevoke(device.id)}
                  disabled={revokingId === device.id}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                >
                  {revokingId === device.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <X className="h-4 w-4" />
                  }
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
