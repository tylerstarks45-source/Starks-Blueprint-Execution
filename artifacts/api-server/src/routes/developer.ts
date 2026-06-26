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

// ─── POST /developer/keys — create a new API key ──────────────────────────────

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

// ─── POST /developer/keys/:id/rotate — revoke old key + issue new one ─────────

router.post("/developer/keys/:id/rotate", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;

  const keyId = Number(req.params.id);
  if (!Number.isFinite(keyId)) {
    res.status(400).json({ error: "Invalid key id" });
    return;
  }

  const [key] = await db
    .select({ id: apiKeysTable.id, userId: apiKeysTable.userId, name: apiKeysTable.name, revokedAt: apiKeysTable.revokedAt })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.id, keyId));

  if (!key || key.userId !== userId) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  if (key.revokedAt) {
    res.status(409).json({ error: "Key is already revoked" });
    return;
  }

  // Revoke the old key and create a replacement with the same name atomically
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeysTable.id, keyId));

  const [created] = await db
    .insert(apiKeysTable)
    .values({ userId, keyHash, keyPrefix, name: key.name })
    .returning({
      id: apiKeysTable.id,
      keyPrefix: apiKeysTable.keyPrefix,
      name: apiKeysTable.name,
      createdAt: apiKeysTable.createdAt,
    });

  res.status(201).json({
    ...serialize(created),
    rawKey,
    revokedKeyId: keyId,
    message: "Old key revoked. Store the new key — it will not be shown again.",
  });
});

// ─── GET /developer/usage — 30-day usage analytics ───────────────────────────

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

  const [dailyUsage, totalCalls, endpointBreakdown, incidentCount] = await Promise.all([
    db
      .select({
        date: sql<string>`DATE(${apiKeyUsageEventsTable.createdAt})`,
        count: sql<number>`COUNT(*)::int`,
        incidents: sql<number>`SUM(CASE WHEN ${apiKeyUsageEventsTable.statusCode} = 429 THEN 1 ELSE 0 END)::int`,
      })
      .from(apiKeyUsageEventsTable)
      .where(and(
        eq(apiKeyUsageEventsTable.userId, userId),
        gte(apiKeyUsageEventsTable.createdAt, thirtyDaysAgo),
      ))
      .groupBy(sql`DATE(${apiKeyUsageEventsTable.createdAt})`)
      .orderBy(sql`DATE(${apiKeyUsageEventsTable.createdAt})`),

    db
      .select({ total: sql<number>`COALESCE(SUM(${apiKeysTable.monthlyCallCount}),0)::int` })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.userId, userId), isNull(apiKeysTable.revokedAt))),

    db
      .select({
        endpoint: apiKeyUsageEventsTable.endpoint,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(apiKeyUsageEventsTable)
      .where(and(
        eq(apiKeyUsageEventsTable.userId, userId),
        gte(apiKeyUsageEventsTable.createdAt, thirtyDaysAgo),
      ))
      .groupBy(apiKeyUsageEventsTable.endpoint)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10),

    db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(apiKeyUsageEventsTable)
      .where(and(
        eq(apiKeyUsageEventsTable.userId, userId),
        gte(apiKeyUsageEventsTable.createdAt, thirtyDaysAgo),
        eq(apiKeyUsageEventsTable.statusCode, 429),
      )),
  ]);

  const tier = (user.membershipTier ?? "free").toLowerCase();
  const rateLimitMap: Record<string, number> = { empire: 100, operator: 20 };
  const rateLimit = rateLimitMap[tier] ?? 20;

  res.json({
    dailyUsage: serialize(dailyUsage),
    totalMonthlyCallCount: totalCalls[0]?.total ?? 0,
    topEndpoints: serialize(endpointBreakdown),
    rateLimitIncidents30d: incidentCount[0]?.total ?? 0,
    tier,
    rateLimit,
    tokenUsageNote: "Per-request token usage tracking is available on AI endpoints via the OpenRouter usage log (see /api/ai-orchestrator platform-stats).",
  });
});

// ─── GET /developer/rate-limits — public tier limits ─────────────────────────

router.get("/developer/rate-limits", async (_req: Request, res: Response) => {
  res.json({
    tiers: {
      empire: { requestsPerMinute: 100, maxKeys: 5 },
      operator: { requestsPerMinute: 20, maxKeys: 5 },
      free: { requestsPerMinute: 20, maxKeys: 5 },
    },
    windowSeconds: 60,
    note: "Rate limits apply per API key per 60-second window. Enterprise plans available via support.",
  });
});

export default router;
