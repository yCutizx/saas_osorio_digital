import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm }  from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, bio, email, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F0]">Perfil</h1>
        <p className="text-sm text-[#888] mt-1">
          Como você aparece pra outros usuários da plataforma.
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  )
}
