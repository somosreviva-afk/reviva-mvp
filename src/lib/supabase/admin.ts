import { createClient } from '@supabase/supabase-js'

// Cliente com service role — bypassa RLS
// Usar APENAS em rotas server-side (API routes, webhooks)
// NUNCA expor no client-side
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado nas variáveis de ambiente')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
