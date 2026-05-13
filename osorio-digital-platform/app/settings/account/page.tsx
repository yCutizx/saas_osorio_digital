import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmailForm }    from './email-form'
import { PasswordForm } from './password-form'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F0]">Conta</h1>
        <p className="text-sm text-[#888] mt-1">
          Gerencie seu email e senha de acesso.
        </p>
      </div>

      <EmailForm currentEmail={user.email ?? ''} />
      <PasswordForm />
    </div>
  )
}
