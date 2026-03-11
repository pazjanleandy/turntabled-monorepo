import { getListsEnv } from "../_lib/config/env.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { ListsService } from "./lists.service.js";
import { CommunityListsRepository } from "./repositories.js";

export function buildListsContainer() {
  const env = getListsEnv();
  const supabase = getSupabaseAdminClient(env);
  const listsRepository = new CommunityListsRepository(supabase);
  const listsService = new ListsService({
    listsRepository,
    supabaseUrl: env.SUPABASE_URL,
  });

  return {
    env,
    supabase,
    listsService,
  };
}
