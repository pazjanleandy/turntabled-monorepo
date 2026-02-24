import { getBacklogEnv } from "../_lib/config/env.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { BacklogService } from "./backlog.service.js";
import { BacklogRepository } from "./repositories.js";

export function buildBacklogContainer() {
  const env = getBacklogEnv();
  const supabase = getSupabaseAdminClient(env);
  const backlogRepository = new BacklogRepository(supabase);
  const backlogService = new BacklogService({ backlogRepository });

  return {
    env,
    supabase,
    backlogService,
  };
}
