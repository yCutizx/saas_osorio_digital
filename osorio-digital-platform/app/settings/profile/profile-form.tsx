'use client'

import { useState }          from 'react'
import { useRouter }         from 'next/navigation'
import { toast }             from 'sonner'
import { updateProfile }     from '../actions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input }             from '@/components/ui/input'
import { Label }             from '@/components/ui/label'
import { Textarea }          from '@/components/ui/textarea'
import { Button }            from '@/components/ui/button'
import { Card }              from '@/components/ui/card'
import { getInitials, getAvatarGradient, getAvatarTextColor } from '@/lib/avatar-utils'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  profile: {
    id:         string
    full_name:  string | null
    bio:        string | null
    email:      string
    avatar_url: string | null
  }
}

export function ProfileForm({ profile }: Props) {
  const router   = useRouter()
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [bio, setBio]           = useState(profile.bio ?? '')
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [isPending, setIsPending] = useState(false)

  const gradient  = getAvatarGradient(profile.id)
  const textColor = getAvatarTextColor(gradient)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    setSuccess(false)

    const result = await updateProfile({ full_name: fullName, bio })

    if (!result.success) {
      setError(result.error ?? 'Erro ao salvar')
      setIsPending(false)
      return
    }

    setSuccess(true)
    setIsPending(false)
    toast.success('Perfil atualizado')
    router.refresh()
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <Card className="bg-[#111] border-[#222] p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-[#EACE00]/35 ring-offset-2 ring-offset-[#111]">
            <AvatarFallback className={`bg-gradient-to-br ${gradient} ${textColor} text-2xl font-black`}>
              {getInitials(fullName || profile.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-[#F5F5F0]">Foto de perfil</p>
            <p className="text-xs text-[#888] mt-1">
              Por enquanto usamos suas iniciais. Upload de foto em breve.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Nome completo</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isPending}
            maxLength={80}
            placeholder="Como você quer ser chamado"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">
            Bio{' '}
            <span className="text-[#666] font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isPending}
            maxLength={280}
            rows={3}
            placeholder="Uma frase sobre você"
          />
          <p className="text-xs text-[#666] text-right">{bio.length}/280</p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />Perfil salvo com sucesso
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isPending || !fullName.trim()}
            className="bg-[#EACE00] text-black hover:bg-[#EACE00]/90 font-semibold"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              : 'Salvar'
            }
          </Button>
        </div>
      </form>
    </Card>
  )
}
