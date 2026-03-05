import { randomUUID } from "crypto";
import { Buffer } from "buffer";
import { InfrastructureError, ValidationError, toErrorResponse } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildProfileContainer } from "./container.js";

const AVATAR_BUCKET = "avatars";
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const IMAGE_DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/i;

function normalizeMimeType(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "image/jpg") return "image/jpeg";
  return trimmed;
}

function parseCoverPayload(body) {
  const rawDataUrl = typeof body?.dataUrl === "string" ? body.dataUrl.trim() : "";
  if (!rawDataUrl) {
    throw new ValidationError("Field 'dataUrl' is required.");
  }

  const match = IMAGE_DATA_URL_PATTERN.exec(rawDataUrl);
  if (!match) {
    throw new ValidationError("Field 'dataUrl' must be a valid PNG or JPEG base64 data URL.");
  }

  const payloadMimeType = normalizeMimeType(match[1]);
  const requestedMimeType = normalizeMimeType(body?.mimeType);
  if (!ALLOWED_MIME_TYPES.has(payloadMimeType)) {
    throw new ValidationError("Only PNG or JPEG cover uploads are supported.");
  }

  if (requestedMimeType && requestedMimeType !== payloadMimeType) {
    throw new ValidationError("Field 'mimeType' must match the provided dataUrl MIME type.");
  }

  const rawBase64 = match[2].replace(/\s+/g, "");
  if (!rawBase64) {
    throw new ValidationError("Cover payload is empty.");
  }

  const buffer = Buffer.from(rawBase64, "base64");
  if (!buffer.length) {
    throw new ValidationError("Cover payload could not be decoded.");
  }
  if (buffer.length > MAX_COVER_BYTES) {
    throw new ValidationError("Cover upload failed: maximum size is 5MB.");
  }

  return {
    mimeType: payloadMimeType,
    buffer,
  };
}

function getImageExtension(mimeType) {
  return mimeType === "image/png" ? "png" : "jpg";
}

async function persistCoverUrlForUser(supabase, userId, coverUrl) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      cover_url: coverUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new InfrastructureError("Failed to save cover URL.", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase } = buildProfileContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const { mimeType, buffer } = parseCoverPayload(req.body ?? {});
    const extension = getImageExtension(mimeType);
    const coverPath = `${userId}/cover-${Date.now()}-${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(coverPath, buffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: mimeType,
    });
    if (uploadError) {
      throw new InfrastructureError("Cover upload failed.", {
        message: uploadError.message,
        code: uploadError.code,
        details: uploadError.details,
      });
    }

    const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(coverPath);
    const coverUrl = urlData?.publicUrl ?? "";
    if (!coverUrl) {
      throw new InfrastructureError("Cover upload failed: could not retrieve public URL.");
    }

    await persistCoverUrlForUser(supabase, userId, coverUrl);

    sendJson(
      res,
      200,
      {
        coverPath,
        coverUrl,
      },
      requestId
    );
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Profile cover upload endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
