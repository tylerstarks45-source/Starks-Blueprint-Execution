/**
 * API Key authentication middleware.
 *
 * Runs on every /api/* request. When an X-API-Key header is present:
 *  1. Hash it (SHA-256) and look up the key in the DB.
 *  2. Enforce per-key rate limits and emit X-RateLimit-* headers.
 *  3. Inject `(req as any).apiKeyCaller` so downstream auth helpers
 *     (requireAuth, requireAuthActive, getUserId) accept it as a valid
 *     alternative to a JWT Bearer token.
 *  4. Write an api_key_usage_events row asynchronously after the response.
 *
 * Industry note: SHA-256 is the correct hash for high-entropy API tokens
 * (GitHub, Stripe, Linear all use it). bcrypt is for low-entropy passwords.
 * A 40-hex-char random key has 160 bits of entropy — collision-resistant
 * with a plain hash; bcrypt would add unnecessary latency (~100 ms/request).
 */

import { type Request, type Response, type NextFunction } from "express";
import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, apiKeysTable, usersTable, apiKeyUsageEventsTable } from "@workspace/db";

// ─── Rate-limit configuration ─────────────────────────────────────────────────

const RATE_LIMITS: Record<string, number> = {
  empire: 100,
  operator: 20,
};
const RATE_LIMIT_DEFAULT = 20;
const WINDOW_MS = 60_000; // 1 minute sliding window

interface RLEntry { count: number; resetAt: number }
const rlStore = new Map<string, RLEntry>();

function checkRateLimit(keyHash: string, tier: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
} {
  const limit = RATE_LIMITS[tier.toLowerCase()] ?? RATE_LIMIT_DEFAULT;
  const now = Date.now();
  const entry = rlStore.get(keyHash);

  if (!entry || now > entry.resetAt) {
    rlStore.set(keyHash, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, limit, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }
  if (entry.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ─── Middleware ────────────────────────────────────────────────────────────────

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const raw = req.headers["x-api-key"];
  const apiKey = Array.isArray(raw) ? raw[0] : raw;

  if (!apiKey || !apiKey.startsWith("sbep_")) {
    next();
    return;
  }

  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  // Look up key by hash
  const [key] = await db
    .select({
      id: apiKeysTable.id,
      userId: apiKeysTable.userId,
      revokedAt: apiKeysTable.revokedAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.keyHash, keyHash))
    .limit(1);

  if (!key || key.revokedAt !== null) {
    res.status(401).json({ error: "Invalid or revoked API key" });
    return;
  }

  // Verify user account is still active
  const [user] = await db
    .select({ active: usersTable.active, membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, key.userId));

  if (!user || user.active === false) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  const tier = (user.membershipTier ?? "free").toLowerCase();
  const role = user.role ?? "USER";

  // Enforce Developer API tier gate — only Empire, Operator, and admin roles may use API keys.
  // This prevents downgraded users from continuing to call the API with old keys.
  const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "FOUNDER_ADMIN"];
  const tierAllowed = tier === "empire" || tier === "operator" || ADMIN_ROLES.includes(role);
  if (!tierAllowed) {
    res.status(403).json({
      error: "API access requires Empire or Operator tier. Upgrade your plan to continue using API keys.",
    });
    return;
  }

  // Apply rate limit
  const rl = checkRateLimit(keyHash, tier);
  res.setHeader("X-RateLimit-Limit", String(rl.limit));
  res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(rl.resetAt / 1000)));

  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    // Log the rate-limit incident so it appears in developer analytics
    void db.insert(apiKeyUsageEventsTable).values({
      apiKeyId: key.id,
      userId: key.userId,
      endpoint: req.path,
      method: req.method,
      statusCode: 429,
      responseTimeMs: 0,
    });
    res.status(429).json({
      error: "Rate limit exceeded. Try again after the reset time.",
      retryAfterSeconds: retryAfter,
    });
    return;
  }

  // Inject caller so auth helpers accept this as a valid session
  (req as any).apiKeyCaller = { userId: key.userId, keyId: key.id, tier, keyHash };

  // Update lastUsedAt + monthlyCallCount (non-blocking fire-and-forget)
  void db
    .update(apiKeysTable)
    .set({
      lastUsedAt: new Date(),
      monthlyCallCount: sql`${apiKeysTable.monthlyCallCount} + 1`,
    })
    .where(eq(apiKeysTable.id, key.id));

  // Write a usage event after the response is sent.
  // AI routes set res.locals.sbepTokenUsage before finishing so we capture real token counts.
  const requestedAt = Date.now();
  res.on("finish", () => {
    const tokenUsage = (res.locals["sbepTokenUsage"] as number | undefined) ?? 0;
    void db.insert(apiKeyUsageEventsTable).values({
      apiKeyId: key.id,
      userId: key.userId,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - requestedAt,
      tokenUsage,
    });
  });

  next();
}
