import { createClient } from '@supabase/supabase-js'

const normalizeEnvValue = (value = '') => value.trim().replace(/^['"]|['"]$/g, '').replace(/;$/, '')

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL || '')
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY || '')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)