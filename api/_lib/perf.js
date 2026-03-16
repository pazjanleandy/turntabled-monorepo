import { logWarn } from "./logger.js";

export async function measureRequest(label, requestId, task, { warnMs = 450 } = {}) {
  const start = Date.now();
  try {
    return await task();
  } finally {
    const durationMs = Date.now() - start;
    const payload = { requestId, label, durationMs };
    if (durationMs >= warnMs) {
      logWarn("Slow request segment.", payload);
    }
  }
}
