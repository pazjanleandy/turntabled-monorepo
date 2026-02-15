/* global process */
import { InfrastructureError } from "../errors.js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new InfrastructureError(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getExploreEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_BASE_URL: requireEnv("APP_BASE_URL"),
    LASTFM_API_KEY: requireEnv("LASTFM_API_KEY"),
    LASTFM_SHARED_SECRET: requireEnv("LASTFM_SHARED_SECRET"),
    LASTFM_CALLBACK_URL: requireEnv("LASTFM_CALLBACK_URL"),
    MUSICBRAINZ_BASE_URL: requireEnv("MUSICBRAINZ_BASE_URL"),
    MUSICBRAINZ_USER_AGENT: requireEnv("MUSICBRAINZ_USER_AGENT"),
    SUPABASE_URL: requireEnv("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    UPSTASH_REDIS_REST_URL: requireEnv("UPSTASH_REDIS_REST_URL"),
    UPSTASH_REDIS_REST_TOKEN: requireEnv("UPSTASH_REDIS_REST_TOKEN"),
    EXPLORE_WORKER_SECRET: requireEnv("EXPLORE_WORKER_SECRET"),
  };
}
