import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const hasSupabase =
  !!(url && key && url !== 'COLOCAR_AQUI' && key !== 'COLOCAR_AQUI')

export const supabase: SupabaseClient = hasSupabase
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (null as any)

// Limites de análises por plano/mês
export const LIMITES_IA: Record<string, number> = {
  individual:    0,
  profissional:  100,
  corporativo:   500,
}

export type PlanoSupabase = 'individual' | 'profissional' | 'corporativo'
