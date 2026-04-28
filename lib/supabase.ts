import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

export function getBrowserClient(): SupabaseClient {
  return createClient(
    required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  )
}

export function getServerClient(): SupabaseClient {
  return createClient(
    required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false } },
  )
}
