import { getExploreEnv } from "../_lib/config/env.js";
import { RedisRestClient } from "../_lib/redis-rest.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { AlbumRepository, ArtistRepository, BacklogRepository } from "./repositories.js";
import { ExploreService } from "./explore.service.js";
import { MusicBrainzClient } from "./musicbrainz.client.js";
import { MusicBrainzWorkerService } from "./musicbrainz-worker.service.js";
import { RateLimitQueueService } from "./rate-limit-queue.service.js";

export function buildExploreContainer() {
  const env = getExploreEnv();
  const supabase = getSupabaseAdminClient(env);
  const redis = new RedisRestClient({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  const backlogRepository = new BacklogRepository(supabase);
  const artistRepository = new ArtistRepository(supabase);
  const albumRepository = new AlbumRepository(supabase);
  const queueService = new RateLimitQueueService(redis);
  const musicBrainzClient = new MusicBrainzClient(env);

  const exploreService = new ExploreService({
    backlogRepository,
    albumRepository,
    artistRepository,
    queueService,
    musicBrainzClient,
  });

  const workerService = new MusicBrainzWorkerService({
    queueService,
    musicBrainzClient,
    artistRepository,
    albumRepository,
    backlogRepository,
  });

  return {
    env,
    supabase,
    exploreService,
    workerService,
  };
}
