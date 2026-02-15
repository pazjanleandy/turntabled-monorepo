import { toErrorResponse, UnauthorizedError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { buildExploreContainer } from "../explore/container.js";

function validateWorkerAuthorization(req, expectedSecret) {
  const customHeader = req.headers["x-worker-secret"];
  const authorization = req.headers.authorization ?? req.headers.Authorization;
  const bearerToken =
    typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;

  if (customHeader !== expectedSecret && bearerToken !== expectedSecret) {
    throw new UnauthorizedError("Invalid worker secret.");
  }
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);
  if (req.method !== "POST" && req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." }, requestId);
    return;
  }

  try {
    const { env, workerService } = buildExploreContainer();
    validateWorkerAuthorization(req, env.EXPLORE_WORKER_SECRET);

    const maxJobs = Number.parseInt(req.query?.maxJobs ?? "10", 10);
    const maxRuntimeMs = Number.parseInt(req.query?.maxRuntimeMs ?? "9000", 10);
    const outcome = await workerService.run({ maxJobs, maxRuntimeMs });

    sendJson(res, 200, { ok: true, ...outcome }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("MusicBrainz worker failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
