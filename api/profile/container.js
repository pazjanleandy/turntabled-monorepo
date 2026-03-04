import { getProfileEnv } from "../_lib/config/env.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { ProfileService } from "./profile.service.js";
import { ProfileRepository } from "./repositories.js";

export function buildProfileContainer() {
  const env = getProfileEnv();
  const supabase = getSupabaseAdminClient(env);
  const profileRepository = new ProfileRepository(supabase);
  const profileService = new ProfileService({
    profileRepository,
    supabaseUrl: env.SUPABASE_URL,
  });

  return {
    env,
    supabase,
    profileService,
  };
}
