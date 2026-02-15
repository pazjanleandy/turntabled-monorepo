import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

export function getSupabaseAdminClient(env) {
  if (cachedClient) return cachedClient;

  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { "x-client-info": "turntabled-explore-backend" } },
  });

  return cachedClient;
}
