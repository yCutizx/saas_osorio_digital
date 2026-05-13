import { redirect }           from 'next/navigation'
import { createClient }        from '@/lib/supabase/server'
import { listTrustedDevices }  from '@/app/(auth)/mfa/actions'
import { MfaSection }          from './mfa-section'
import { DevicesSection }      from './devices-section'

export default async function SecurityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const devices = await listTrustedDevices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F0]">Segurança</h1>
        <p className="text-sm text-[#888] mt-1">
          Gerencie autenticação em dois fatores e dispositivos confiáveis.
        </p>
      </div>

      <MfaSection />
      <DevicesSection initialDevices={devices} />
    </div>
  )
}
