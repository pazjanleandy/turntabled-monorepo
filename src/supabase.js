import { createClient } from '@supabase/supabase-js'
import { getRuntimeEnv } from './runtimeEnv.js'

const normalizeEnvValue = (value = '') => value.trim().replace(/^['"]|['"]$/g, '').replace(/;$/, '')

const supabaseUrl = normalizeEnvValue(getRuntimeEnv('VITE_SUPABASE_URL'))
const supabaseAnonKey = normalizeEnvValue(getRuntimeEnv('VITE_SUPABASE_ANON_KEY'))

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
