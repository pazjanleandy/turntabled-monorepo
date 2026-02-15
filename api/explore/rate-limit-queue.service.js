import { InfrastructureError } from "../_lib/errors.js";

const QUEUE_KEY = "mb:queue";
const RETRY_KEY = "mb:retry";
const DEDUPE_PREFIX = "mb:dedupe:";
const COOLDOWN_PREFIX = "mb:cooldown:";
const RATE_GATE_KEY = "mb:rate-gate";
const TRACKLIST_CACHE_PREFIX = "mb:tracklist:";

export class RateLimitQueueService {
  constructor(redis) {
    this.redis = redis;
  }

  _dedupeKey(resourceKey) {
    return `${DEDUPE_PREFIX}${resourceKey}`;
  }

  _cooldownKey(resourceKey) {
    return `${COOLDOWN_PREFIX}${resourceKey}`;
  }

  async enqueueIfMissing(job) {
    const cooldown = await this.redis.command(["GET", this._cooldownKey(job.resourceKey)]);
    if (cooldown) return false;

    const dedupeResult = await this.redis.command([
      "SET",
      this._dedupeKey(job.resourceKey),
      "1",
      "NX",
      "EX",
      "900",
    ]);
    if (dedupeResult !== "OK") return false;

    await this.redis.command(["LPUSH", QUEUE_KEY, JSON.stringify(job)]);
    return true;
  }

  async moveDueRetries() {
    const now = Date.now();
    const due = await this.redis.command([
      "ZRANGEBYSCORE",
      RETRY_KEY,
      "-inf",
      `${now}`,
      "LIMIT",
      "0",
      "50",
    ]);

    if (!Array.isArray(due) || due.length === 0) return 0;

    const pipeline = [];
    for (const payload of due) {
      pipeline.push(["ZREM", RETRY_KEY, payload]);
      pipeline.push(["LPUSH", QUEUE_KEY, payload]);
    }
    await this.redis.pipeline(pipeline);
    return due.length;
  }

  async pop() {
    const payload = await this.redis.command(["RPOP", QUEUE_KEY]);
    if (!payload) return null;

    try {
      return JSON.parse(payload);
    } catch {
      throw new InfrastructureError("Corrupt job payload in MusicBrainz queue.");
    }
  }

  async requeue(job) {
    await this.redis.command(["RPUSH", QUEUE_KEY, JSON.stringify(job)]);
  }

  async scheduleRetry(job, attempt) {
    const backoffMs = Math.min(60000, 1000 * 2 ** Math.max(0, attempt - 1));
    const jitterMs = Math.floor(Math.random() * 250);
    const runAt = Date.now() + backoffMs + jitterMs;
    await this.redis.command(["ZADD", RETRY_KEY, `${runAt}`, JSON.stringify(job)]);
  }

  async acquireRateGate() {
    const result = await this.redis.command(["SET", RATE_GATE_KEY, "1", "NX", "PX", "1000"]);
    return result === "OK";
  }

  async getTracklistCache(releaseMbid) {
    const serialized = await this.redis.command(["GET", `${TRACKLIST_CACHE_PREFIX}${releaseMbid}`]);
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async setTracklistCache(releaseMbid, tracks) {
    await this.redis.command([
      "SET",
      `${TRACKLIST_CACHE_PREFIX}${releaseMbid}`,
      JSON.stringify(tracks),
      "EX",
      "86400",
    ]);
  }

  async markSuccess(resourceKey) {
    await this.redis.pipeline([
      ["DEL", this._dedupeKey(resourceKey)],
      ["SET", this._cooldownKey(resourceKey), "1", "EX", "3600"],
    ]);
  }

  async markPermanentFailure(resourceKey) {
    await this.redis.pipeline([
      ["DEL", this._dedupeKey(resourceKey)],
      ["SET", this._cooldownKey(resourceKey), "1", "EX", "86400"],
    ]);
  }

  async unlockForRetry(resourceKey) {
    await this.redis.command(["DEL", this._dedupeKey(resourceKey)]);
  }
}
