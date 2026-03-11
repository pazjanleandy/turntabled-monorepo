import { randomUUID } from "crypto";
import { Buffer } from "buffer";
import { InfrastructureError, ValidationError, toErrorResponse } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildProfileContainer } from "./container.js";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const AVATAR_DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/i;

function normalizeMimeType(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "image/jpg") return "image/jpeg";
  return trimmed;
}

function parseAvatarPayload(body) {
  const rawDataUrl = typeof body?.dataUrl === "string" ? body.dataUrl.trim() : "";
  if (!rawDataUrl) {
    throw new ValidationError("Field 'dataUrl' is required.");
  }

  const match = AVATAR_DATA_URL_PATTERN.exec(rawDataUrl);
  if (!match) {
    throw new ValidationError("Field 'dataUrl' must be a valid PNG or JPEG base64 data URL.");
  }

  const payloadMimeType = normalizeMimeType(match[1]);
  const requestedMimeType = normalizeMimeType(body?.mimeType);
  if (!ALLOWED_MIME_TYPES.has(payloadMimeType)) {
    throw new ValidationError("Only PNG or JPEG avatar uploads are supported.");
  }

  if (requestedMimeType && requestedMimeType !== payloadMimeType) {
    throw new ValidationError("Field 'mimeType' must match the provided dataUrl MIME type.");
  }

  const rawBase64 = match[2].replace(/\s+/g, "");
  if (!rawBase64) {
    throw new ValidationError("Avatar payload is empty.");
  }

  const buffer = Buffer.from(rawBase64, "base64");
  if (!buffer.length) {
    throw new ValidationError("Avatar payload could not be decoded.");
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new ValidationError("Image upload failed: maximum size is 2MB.");
  }

  return {
    mimeType: payloadMimeType,
    buffer,
  };
}

function getAvatarExtension(mimeType) {
  return mimeType === "image/png" ? "png" : "jpg";
}

async function persistAvatarPathForUser(supabase, userId, avatarPath) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      avatar_path: avatarPath,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new InfrastructureError("Failed to save avatar path.", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }
}

async function persistAvatarUrlForUser(supabase, userId, avatarUrl) {
  const { error } = await supabase
    .from("users")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new InfrastructureError("Failed to save avatar URL.", {
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

    const { mimeType, buffer } = parseAvatarPayload(req.body ?? {});
    const extension = getAvatarExtension(mimeType);
    const avatarPath = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, buffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: mimeType,
    });
    if (uploadError) {
      throw new InfrastructureError("Image upload failed.", {
        message: uploadError.message,
        code: uploadError.code,
        details: uploadError.details,
      });
    }

    await persistAvatarPathForUser(supabase, userId, avatarPath);
    const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
    const avatarUrl = urlData?.publicUrl ?? null;
    if (avatarUrl) {
      await persistAvatarUrlForUser(supabase, userId, avatarUrl);
    }

    sendJson(
      res,
      200,
      {
        avatarPath,
        avatarUrl,
      },
      requestId
    );
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Profile avatar upload endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
