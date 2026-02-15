import { randomUUID } from "crypto";
import { ValidationError } from "./errors.js";

export function getRequestId(req) {
  const incoming = req.headers["x-request-id"];
  return typeof incoming === "string" && incoming.trim() ? incoming : randomUUID();
}

export function sendJson(res, statusCode, payload, requestId) {
  res.setHeader("x-request-id", requestId);
  res.status(statusCode).json(payload);
}

export function parsePagination(query) {
  const page = Number.parseInt(query?.page ?? "1", 10);
  const limit = Number.parseInt(query?.limit ?? "20", 10);

  if (!Number.isInteger(page) || page < 1) {
    throw new ValidationError("Query param 'page' must be a positive integer.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ValidationError("Query param 'limit' must be an integer between 1 and 50.");
  }

  return { page, limit };
}
