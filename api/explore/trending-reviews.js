import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { buildExploreContainer } from "./container.js";

function parseBoundedInt(value, { fallback, min, max, label }) {
  if (value == null || value === "") return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(
      `Query param '${label}' must be an integer between ${min} and ${max}.`
    );
  }

  return parsed;
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." }, requestId);
    return;
  }

  try {
    const limit = parseBoundedInt(req.query?.limit, {
      fallback: 4,
      min: 1,
      max: 12,
      label: "limit",
    });
    const windowDays = parseBoundedInt(req.query?.windowDays, {
      fallback: 7,
      min: 1,
      max: 30,
      label: "windowDays",
    });
    const reviewWindowDays = parseBoundedInt(req.query?.reviewWindowDays, {
      fallback: 30,
      min: windowDays,
      max: 120,
      label: "reviewWindowDays",
    });

    const { exploreService } = buildExploreContainer();
    const data = await exploreService.getTrendingReviews(limit, {
      interactionWindowDays: windowDays,
      reviewWindowDays,
    });

    sendJson(res, 200, data, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Explore trending reviews endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error instanceof ValidationError ? "VALIDATION_ERROR" : "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
