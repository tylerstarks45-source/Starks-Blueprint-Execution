import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, randomBytes } from "crypto";
import { eq, and, desc, gte, sql, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  apiKeysTable,
  apiKeyUsageEventsTable,
} from "@workspace/db";
import { requireAuthActive, isAdminRole } from "../lib/auth";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasDevAccess(tier: string | null | undefined, role: string | null | undefined): boolean {
  const t = (tier ?? "").toLowerCase();
  const r = role ?? "USER";
  return t === "empire" || t === "operator" || isAdminRole(r);
}

function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const entropy = randomBytes(24).toString("hex"); // 48 hex chars
  const rawKey = `sbep_${entropy}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = entropy.slice(0, 8);
  return { rawKey, keyHash, keyPrefix };
}

// ─── Rate-limit store (in-memory, keyed by keyHash) ───────────────────────────

interface RLEntry { count: number; resetAt: number }
const rlStore = new Map<string, RLEntry>();
const WINDOW_MS = 60_000;
const RL_LIMITS: Record<string, number> = { empire: 100, operator: 60 };
const RL_DEFAULT = 20;

export function checkApiKeyRateLimit(
  keyHash: string,
  tier: string,
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const limit = RL_LIMITS[tier.toLowerCase()] ?? RL_DEFAULT;
  const now = Date.now();
  const entry = rlStore.get(keyHash);
  if (!entry || now > entry.resetAt) {
    rlStore.set(keyHash, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS, limit };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit };
  }
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt, limit };
}

// ─── Lookup & validate an API key from the X-API-Key header ──────────────────

export interface ApiKeyCaller {
  userId: number;
  keyId: number;
  tier: string;
  keyHash: string;
}

export async function resolveApiKeyAuth(req: Request): Promise<ApiKeyCaller | null> {
  const raw = req.headers["x-api-key"];
  const apiKey = Array.isArray(raw) ? raw[0] : raw;
  if (!apiKey || !apiKey.startsWith("sbep_")) return null;

  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const [key] = await db
    .select({ id: apiKeysTable.id, userId: apiKeysTable.userId, revokedAt: apiKeysTable.revokedAt })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.keyHash, keyHash))
    .limit(1);

  if (!key || key.revokedAt !== null) return null;

  const [user] = await db
    .select({ active: usersTable.active, membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, key.userId));

  if (!user || user.active === false) return null;

  const tier = (user.membershipTier ?? "free").toLowerCase();

  // Update lastUsedAt and increment monthlyCallCount async (non-blocking)
  void db
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date(), monthlyCallCount: sql`${apiKeysTable.monthlyCallCount} + 1` })
    .where(eq(apiKeysTable.id, key.id));

  return { userId: key.userId, keyId: key.id, tier, keyHash };
}

// ─── POST /developer/keys — create a new API key ─────────────────────────────

router.post("/developer/keys", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;

  const [user] = await db
    .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || !hasDevAccess(user.membershipTier, user.role)) {
    res.status(403).json({ error: "Developer API access requires Empire tier or higher" });
    return;
  }

  const existing = await db
    .select({ id: apiKeysTable.id })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, userId), isNull(apiKeysTable.revokedAt)));

  if (existing.length >= 5) {
    res.status(409).json({ error: "Maximum of 5 active API keys allowed. Revoke an existing key first." });
    return;
  }

  const name = String(req.body?.name ?? "Default Key").trim().slice(0, 80) || "Default Key";
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const [created] = await db
    .insert(apiKeysTable)
    .values({ userId, keyHash, keyPrefix, name })
    .returning({
      id: apiKeysTable.id,
      keyPrefix: apiKeysTable.keyPrefix,
      name: apiKeysTable.name,
      createdAt: apiKeysTable.createdAt,
    });

  res.status(201).json({
    ...serialize(created),
    rawKey,
    message: "Store this key now — it will not be shown again.",
  });
});

// ─── GET /developer/keys — list user's API keys ───────────────────────────────

router.get("/developer/keys", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;

  const [user] = await db
    .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || !hasDevAccess(user.membershipTier, user.role)) {
    res.status(403).json({ error: "Developer API access requires Empire tier or higher" });
    return;
  }

  const keys = await db
    .select({
      id: apiKeysTable.id,
      keyPrefix: apiKeysTable.keyPrefix,
      name: apiKeysTable.name,
      lastUsedAt: apiKeysTable.lastUsedAt,
      revokedAt: apiKeysTable.revokedAt,
      monthlyCallCount: apiKeysTable.monthlyCallCount,
      createdAt: apiKeysTable.createdAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, userId))
    .orderBy(desc(apiKeysTable.createdAt));

  res.json(serialize(keys));
});

// ─── DELETE /developer/keys/:id — revoke a key ────────────────────────────────

router.delete("/developer/keys/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;

  const keyId = Number(req.params.id);
  if (!Number.isFinite(keyId)) {
    res.status(400).json({ error: "Invalid key id" });
    return;
  }

  const [key] = await db
    .select({ id: apiKeysTable.id, userId: apiKeysTable.userId, revokedAt: apiKeysTable.revokedAt })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.id, keyId));

  if (!key || key.userId !== userId) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  if (key.revokedAt) {
    res.status(409).json({ error: "Key already revoked" });
    return;
  }

  await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeysTable.id, keyId));

  res.json({ success: true, revokedAt: new Date().toISOString() });
});

// ─── GET /developer/usage — usage analytics ────────────────────────────────────

router.get("/developer/usage", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;

  const [user] = await db
    .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || !hasDevAccess(user.membershipTier, user.role)) {
    res.status(403).json({ error: "Developer API access requires Empire tier or higher" });
    return;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const events = await db
    .select({
      date: sql<string>`DATE(${apiKeyUsageEventsTable.createdAt})`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(apiKeyUsageEventsTable)
    .where(
      and(
        eq(apiKeyUsageEventsTable.userId, userId),
        gte(apiKeyUsageEventsTable.createdAt, thirtyDaysAgo),
      )
    )
    .groupBy(sql`DATE(${apiKeyUsageEventsTable.createdAt})`)
    .orderBy(sql`DATE(${apiKeyUsageEventsTable.createdAt})`);

  const totalCalls = await db
    .select({ total: sql<number>`SUM(${apiKeysTable.monthlyCallCount})::int` })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, userId), isNull(apiKeysTable.revokedAt)));

  res.json({
    dailyUsage: serialize(events),
    totalMonthlyCallCount: totalCalls[0]?.total ?? 0,
    tier: (user.membershipTier ?? "free").toLowerCase(),
    rateLimit: RL_LIMITS[(user.membershipTier ?? "free").toLowerCase()] ?? RL_DEFAULT,
  });
});

// ─── GET /developer/rate-limits — rate limit info ────────────────────────────

router.get("/developer/rate-limits", async (req: Request, res: Response) => {
  res.json({
    tiers: {
      empire: { requestsPerMinute: 100, maxKeys: 5 },
      operator: { requestsPerMinute: 60, maxKeys: 5 },
      free: { requestsPerMinute: 20, maxKeys: 5 },
    },
    note: "Rate limits apply per API key per minute. Enterprise plans available via support.",
  });
});

export default router;
