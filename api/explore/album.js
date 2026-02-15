import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { buildExploreContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." }, requestId);
    return;
  }

  try {
    const id = req.query?.id;
    if (typeof id !== "string" || !id.trim()) {
      throw new ValidationError("Query param 'id' is required.");
    }

    const { exploreService } = buildExploreContainer();
    const album = await exploreService.getAlbumDetails(id.trim());

    if (!album) {
      sendJson(
        res,
        404,
        { error: { code: "NOT_FOUND", message: "Album not found." }, requestId },
        requestId
      );
      return;
    }

    sendJson(res, 200, { item: album }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Explore album endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error instanceof ValidationError ? "VALIDATION_ERROR" : "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
