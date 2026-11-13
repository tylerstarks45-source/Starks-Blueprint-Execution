import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiKeyMiddleware } from "./middlewares/apiKey";
import { createAiRateLimiter, redactServerErrors, securityHeaders } from "./middlewares/security";

const app: Express = express();

// Replit routes through a reverse proxy — trust the X-Forwarded-For header so
// rate limiters and IP-based logic see the real client IP instead of the proxy.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);

// ── C-03 fix: CORS allowlist instead of permissive wildcard ────────────────
// Allow: all *.replit.dev / *.repl.co / *.replit.app preview + production
//        domains, explicitly listed ALLOWED_ORIGINS, localhost in dev.
// Non-browser clients (curl, server-to-server) have no Origin — allowed.
const _extraOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const _explicitOrigins = new Set<string>(_extraOrigins);

for (const base of [process.env["APP_URL"], process.env["APP_BASE_URL"]]) {
  if (!base) continue;
  try { _explicitOrigins.add(new URL(base).origin); } catch { /* ignore malformed */ }
}
if (process.env["REPLIT_DEV_DOMAIN"]) {
  _explicitOrigins.add(`https://${process.env["REPLIT_DEV_DOMAIN"]}`);
}
if (process.env["NODE_ENV"] !== "production") {
  for (const lh of ["http://localhost:3000", "http://localhost:5173", "http://localhost:22333", "http://localhost:8080"]) {
    _explicitOrigins.add(lh);
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser / server-to-server
      if (
        origin.endsWith(".replit.dev") ||
        origin.endsWith(".repl.co") ||
        origin.endsWith(".replit.app") ||
        _explicitOrigins.has(origin)
      ) {
        return callback(null, true);
      }
      logger.warn({ origin }, "CORS: rejected unlisted origin");
      return callback(new Error("CORS: origin not in allowlist"), false);
    },
    credentials: true,
  }),
);

// Capture raw body for webhook signature verification (Stripe + SendGrid).
// Also manually parses JSON so req.body is still available in route handlers
// (the readable stream can only be consumed once, so express.json() would see an empty body).
const RAW_BODY_PATHS = new Set(["/api/stripe/webhook", "/api/email/webhooks/sendgrid", "/api/webhooks/sendgrid"]);
app.use((req, _res, next) => {
  if (RAW_BODY_PATHS.has(req.path)) {
    let data = Buffer.alloc(0);
    req.on("data", (chunk: Buffer) => { data = Buffer.concat([data, chunk]); });
    req.on("end", () => {
      (req as any).rawBody = data;
      if (data.length > 0) {
        try { req.body = JSON.parse(data.toString("utf8")); } catch { req.body = {}; }
      } else {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// /api/ash/* → /api/ai-orchestrator/* URL alias so external callers can use either path.
// Must run before the API key middleware and router so both paths are authenticated equally.
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/ash/")) {
    req.url = req.url.replace("/api/ash/", "/api/ai-orchestrator/");
  }
  next();
});

// Validate X-API-Key before routing — injects req.apiKeyCaller, enforces
// rate limits, and writes usage events. Must run before the route handlers.
app.use("/api", apiKeyMiddleware);
app.use("/api", createAiRateLimiter());
app.use("/api", redactServerErrors);

app.use("/api", router);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Last-resort error handler: always JSON, never a stack trace.
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const e = err as { status?: number; statusCode?: number; type?: string; message?: string };
  if (e?.message?.startsWith("CORS:")) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  const status = e?.status ?? e?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const message = e.type === "entity.parse.failed" ? "Malformed JSON body"
      : e.type === "entity.too.large" ? "Request body too large"
      : "Bad request";
    res.status(status).json({ error: message });
    return;
  }
  req.log?.error({ err }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

export default app;
