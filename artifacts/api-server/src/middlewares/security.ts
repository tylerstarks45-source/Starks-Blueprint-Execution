import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { getUserId } from "../lib/auth";
import { logger } from "../lib/logger";

// The API also serves user-generated landing pages and OAuth callback pages, so
// CSP and COOP are left off to avoid breaking inline scripts and window.opener.
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

const EXPENSIVE_AI_PATHS: RegExp[] = [
  /^\/ai-orchestrator\//,
  /^\/executive-brain\/stream$/,
  /^\/dashboard\/chat$/,
  /^\/build-engine\//,
  /^\/browser-agent\//,
  /^\/research\//,
  /^\/media-gen\//,
  /^\/openrouter\/complete$/,
  /^\/ai\/(openrouter|testing)\//,
  /\/generate(-variants)?$/,
];

export function isExpensiveAiRequest(method: string, path: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  return EXPENSIVE_AI_PATHS.some((re) => re.test(path));
}

function rateLimitKey(req: Request): string {
  const userId = getUserId(req);
  return userId ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

/** Per-user (or per-IP when anonymous) limit on endpoints that spend AI credits or provider quota. */
export function createAiRateLimiter(limitPerMinute = Number(process.env["AI_RATE_LIMIT_PER_MINUTE"] ?? 20)): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: Number.isFinite(limitPerMinute) && limitPerMinute > 0 ? limitPerMinute : 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    skip: (req) => !isExpensiveAiRequest(req.method, req.path),
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many AI requests. Please wait a moment and try again.", code: "rate_limited" });
    },
  });
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b[A-Z][A-Z0-9]*_(API_KEY|KEY|SECRET|TOKEN|URL|PASSWORD)\b/,
  /environment variable/i,
  /\bE(CONNREFUSED|CONNRESET|NOTFOUND|TIMEDOUT|AI_AGAIN)\b/,
  /\b(relation|column|constraint|table|database) "[^"]+"/i,
  /duplicate key value|violates .* constraint|syntax error at or near|Failed query:/i,
  /postgres(ql)?:\/\//i,
  /\bat \S+\.(ts|js|mjs|cjs):\d+/,
  /\/home\/|\/nix\/store\/|node_modules/,
  /Cannot read propert|is not a function|is not defined|Unexpected token/,
];

export function isSensitiveErrorMessage(message: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(message));
}

const AI_UNAVAILABLE_MESSAGE = "AI service is temporarily unavailable. Please try again later.";

/**
 * Message safe to show a client for an unexpected server-side error. Internal
 * details (env var names, SQL, stack frames, hostnames) are logged, not returned.
 */
export function publicErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!message) return fallback;
  if (/OPENROUTER_API_KEY/.test(message)) return AI_UNAVAILABLE_MESSAGE;
  return isSensitiveErrorMessage(message) ? fallback : message;
}

/** Rewrites 5xx JSON bodies whose `error` would leak server configuration or internals. */
export const redactServerErrors: RequestHandler = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body?: unknown) => {
    if (res.statusCode >= 500 && body && typeof body === "object" && !Array.isArray(body)) {
      const b = body as Record<string, unknown>;
      const { stack: _stack, ...rest } = b;
      if (typeof b["error"] === "string" && isSensitiveErrorMessage(b["error"])) {
        logger.warn({ path: req.path, status: res.statusCode, original: b["error"] }, "Redacted internal error message from response");
        if (/OPENROUTER_API_KEY/.test(b["error"])) {
          res.status(503);
          return originalJson({ ...rest, error: AI_UNAVAILABLE_MESSAGE, code: rest["code"] ?? "ai_unavailable" });
        }
        return originalJson({ ...rest, error: "Internal server error" });
      }
      return originalJson(rest);
    }
    return originalJson(body);
  };
  next();
};

/** Final JSON error handler so unhandled errors never return Express's default HTML/stack page. */
export const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const e = err as { status?: number; statusCode?: number; expose?: boolean; message?: string };
  if (e?.message?.startsWith("CORS:")) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  const status = e?.status ?? e?.statusCode ?? 500;
  if (status < 500 && e?.expose) {
    res.status(status).json({ error: e.message });
    return;
  }
  logger.error({ err, path: req.path }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
};
