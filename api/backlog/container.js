import { getBacklogEnv } from "../_lib/config/env.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { BacklogService } from "./backlog.service.js";
import { ReviewInteractionsRepository } from "./review-interactions.repositories.js";
import { ReviewInteractionsService } from "./review-interactions.service.js";
import { BacklogRepository } from "./repositories.js";

export function buildBacklogContainer() {
  const env = getBacklogEnv();
  const supabase = getSupabaseAdminClient(env);
  const backlogRepository = new BacklogRepository(supabase);
  const backlogService = new BacklogService({ backlogRepository });
  const reviewInteractionsRepository = new ReviewInteractionsRepository(supabase);
  const reviewInteractionsService = new ReviewInteractionsService({
    reviewInteractionsRepository,
    supabaseUrl: env.SUPABASE_URL,
  });

  return {
    env,
    supabase,
    backlogService,
    reviewInteractionsService,
  };
}
