import { getNotificationsEnv } from "../_lib/config/env.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsRepository } from "./repositories.js";

export function buildNotificationsContainer() {
  const env = getNotificationsEnv();
  const supabase = getSupabaseAdminClient(env);
  const notificationsRepository = new NotificationsRepository(supabase);
  const notificationsService = new NotificationsService({
    notificationsRepository,
    supabaseUrl: env.SUPABASE_URL,
  });

  return {
    env,
    supabase,
    notificationsService,
  };
}
