import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Sin variables de entorno la app corre en modo demo (todo local). */
export const MODO_DEMO = !url || !anon || url.includes('TU-PROYECTO')

export const supabase: SupabaseClient | null = MODO_DEMO
  ? null
  : createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })

export const BUCKET_EVIDENCIAS = 'evidencias'
