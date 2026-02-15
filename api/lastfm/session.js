/* global process, Buffer */
import { createHash } from "crypto";

function md5(input) {
  return createHash("md5").update(input).digest("hex");
}

function buildApiSig(params, secret) {
  const keys = Object.keys(params).sort();
  const base = keys.map((key) => `${key}${params[key]}`).join("") + secret;
  return md5(base);
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const apiKey = process.env.LASTFM_API_KEY || process.env.VITE_LASTFM_API_KEY;
  const sharedSecret = process.env.LASTFM_SHARED_SECRET;

  if (!apiKey || !sharedSecret) {
    res.status(500).json({ error: "Missing Last.fm server configuration." });
    return;
  }

  const body = await parseBody(req);
  const token = req.query?.token || body?.token;

  if (!token) {
    res.status(400).json({ error: "Missing token." });
    return;
  }

  const params = {
    api_key: apiKey,
    method: "auth.getSession",
    token,
  };

  const apiSig = buildApiSig(params, sharedSecret);
  const urlParams = new URLSearchParams({
    ...params,
    api_sig: apiSig,
    format: "json",
  });

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?${urlParams.toString()}`
    );
    const data = await response.json();

    if (!response.ok || data?.error) {
      res.status(400).json({
        error: data?.message || "Last.fm session request failed.",
      });
      return;
    }

    const session = data?.session;
    res.status(200).json({
      username: session?.name,
      sessionKey: session?.key,
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Server error." });
  }
}
