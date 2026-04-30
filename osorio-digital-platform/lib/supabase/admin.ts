import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com a Service Role Key.
 * Uso EXCLUSIVO em Server Actions e API Routes — nunca em Client Components.
 * Com essa chave é possível criar/deletar usuários e bypassa o RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não encontrada. Adicione ao .env.local'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
