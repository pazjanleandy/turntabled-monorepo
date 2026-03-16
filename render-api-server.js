/* global process */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cors from "cors";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRootDir = path.join(__dirname, "api");
const handlerCache = new Map();

const DEFAULT_PORT = 3001;
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

function buildCorsOptions() {
  const allowedOrigins = [
    ...toArray(process.env.CORS_ORIGINS),
    ...toArray(process.env.APP_BASE_URL),
  ].map(normalizeOrigin);

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

  for (const { routePath, filePath } of routes) {
    app.all(routePath, async (req, res, next) => {
      try {
        const handler = await getHandler(filePath);
        if (!handler) {
          res.status(500).json({ error: "Route handler is missing default export." });
          return;
        }

        req.query = { ...(req.query ?? {}), ...(req.params ?? {}) };
        await handler(req, res);

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

  app.use((error, _req, res, NEXT) => {
    void NEXT;
    const statusCode = /CORS/i.test(String(error?.message ?? "")) ? 403 : 500;
    const message = statusCode === 403 ? error.message : "Unexpected server error.";
    res.status(statusCode).json({ error: message });
  });

  return { app, routes };
}

const port = Number(process.env.PORT || DEFAULT_PORT);
const { app, routes } = await createApp();

app.listen(port, () => {
  console.log(`Render API listening on port ${port}`);
  console.log(`Mounted ${routes.length} API route handlers`);
});
