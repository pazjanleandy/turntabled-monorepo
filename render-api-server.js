/* global process */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cors from "cors";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRootDir = path.join(__dirname, "api");
const frontendDistDir = path.join(__dirname, "dist");
const frontendIndexPath = path.join(frontendDistDir, "index.html");
const handlerCache = new Map();

const DEFAULT_PORT = 3001;
const DEFAULT_CORS_ORIGINS = [
  "https://turntabled-backend.onrender.com",
  "https://turntabled-frontend.onrender.com",
];
const HANDLER_EXPORT_PATTERN =
  /export\s+default\s+(?:async\s+)?function\s+handler\b/;

function toArray(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

function firstEnvValue(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function serializePublicEnv() {
  const publicEnv = {
    VITE_API_BASE_URL: firstEnvValue("VITE_API_BASE_URL"),
    VITE_SUPABASE_URL: firstEnvValue("VITE_SUPABASE_URL", "SUPABASE_URL"),
    VITE_SUPABASE_ANON_KEY: firstEnvValue(
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
    ),
    VITE_LASTFM_API_KEY: firstEnvValue("VITE_LASTFM_API_KEY", "LASTFM_API_KEY"),
  };

  return JSON.stringify(publicEnv).replace(/</g, "\\u003c");
}

function normalizeRouteSegment(segment) {
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return `:${segment.slice(1, -1)}`;
  }
  return segment;
}

function getRoutePathFromFile(absoluteFilePath) {
  const relative = path.relative(apiRootDir, absoluteFilePath).replace(/\\/g, "/");
  const withoutExt = relative.replace(/\.js$/i, "");
  const withoutIndex = withoutExt.replace(/\/index$/i, "");
  const segments = withoutIndex.split("/").filter(Boolean).map(normalizeRouteSegment);
  return `/api/${segments.join("/")}`;
}

function countDynamicSegments(routePath) {
  return routePath.split("/").filter((segment) => segment.startsWith(":")).length;
}

async function isHandlerFile(absoluteFilePath) {
  const source = await fs.readFile(absoluteFilePath, "utf8");
  return HANDLER_EXPORT_PATTERN.test(source);
}

async function discoverHandlerFiles(rootDir) {
  const stack = [rootDir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "_lib") continue;

      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
      if (await isHandlerFile(absolutePath)) {
        files.push(absolutePath);
      }
    }
  }

  return files;
}

async function getHandler(absoluteFilePath) {
  if (handlerCache.has(absoluteFilePath)) {
    return handlerCache.get(absoluteFilePath);
  }

  const module = await import(pathToFileURL(absoluteFilePath).href);
  const handler = typeof module.default === "function" ? module.default : null;
  handlerCache.set(absoluteFilePath, handler);
  return handler;
}

function toQueryObject(req) {
  const rawQuery = req.query;
  if (!rawQuery || typeof rawQuery !== "object") return {};
  return { ...rawQuery };
}

function buildCorsOptions() {
  const allowedOrigins = [
    ...DEFAULT_CORS_ORIGINS,
    ...toArray(process.env.CORS_ORIGINS),
    ...toArray(process.env.APP_BASE_URL),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin '${origin}' is not allowed by CORS.`));
    },
    credentials: true,
  };
}

async function createApp() {
  const app = express();
  const hasFrontendBundle = await fs
    .access(frontendIndexPath)
    .then(() => true)
    .catch(() => false);
  const handlerFiles = await discoverHandlerFiles(apiRootDir);
  const routes = handlerFiles
    .map((filePath) => ({ filePath, routePath: getRoutePathFromFile(filePath) }))
    .sort((a, b) => {
      const aDynamic = countDynamicSegments(a.routePath);
      const bDynamic = countDynamicSegments(b.routePath);
      if (aDynamic !== bDynamic) return aDynamic - bDynamic;
      return b.routePath.length - a.routePath.length;
    });

  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/env.js", (_req, res) => {
    res
      .type("application/javascript")
      .set("Cache-Control", "no-store")
      .send(`window.__TURNTABLED_ENV__ = ${serializePublicEnv()};\n`);
  });

  for (const { routePath, filePath } of routes) {
    app.all(routePath, async (req, res, next) => {
      try {
        const handler = await getHandler(filePath);
        if (!handler) {
          res.status(500).json({ error: "Route handler is missing default export." });
          return;
        }

        const handlerReq = Object.create(req);
        Object.defineProperty(handlerReq, "query", {
          value: { ...toQueryObject(req), ...(req.params ?? {}) },
          writable: true,
          enumerable: true,
          configurable: true,
        });
        await handler(handlerReq, res);

        if (!res.headersSent) {
          res.status(204).end();
        }
      } catch (error) {
        next(error);
      }
    });
  }

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  if (hasFrontendBundle) {
    app.use(express.static(frontendDistDir, { index: false }));
  }

  app.use((req, res, next) => {
    if (!hasFrontendBundle) {
      next();
      return;
    }

    if (!["GET", "HEAD"].includes(req.method) || req.path.startsWith("/api")) {
      next();
      return;
    }

    if (!req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(frontendIndexPath);
  });

  app.use((error, _req, res, NEXT) => {
    void NEXT;
    const statusCode = /CORS/i.test(String(error?.message ?? "")) ? 403 : 500;
    const isProduction = process.env.NODE_ENV === "production";
    const message = statusCode === 403 ? error.message : "Unexpected server error.";
    const payload =
      !isProduction && statusCode === 500
        ? { error: message, details: String(error?.message ?? ""), stack: error?.stack ?? null }
        : { error: message };
    console.error("[render-api-server] route error", error);
    res.status(statusCode).json(payload);
  });

  app.use((_req, res) => {
    res.status(404).type("text/plain").send("Not found.");
  });

  return { app, routes };
}

const port = Number(process.env.PORT || DEFAULT_PORT);
const { app, routes } = await createApp();

app.listen(port, () => {
  console.log(`Render API listening on port ${port}`);
  console.log(`Mounted ${routes.length} API route handlers`);
});
