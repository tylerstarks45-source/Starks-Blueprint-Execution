import { Router, type IRouter } from "express";
import os from "node:os";
import { serialize } from "../lib/serialize";
import { desc, sql, eq, and, or, ilike, gte } from "drizzle-orm";
import {
  db,
  adminUsersTable,
  adminActivityTable,
  systemHealthTable,
  usersTable,
  blueprintsTable,
  toolsTable,
  systemInstancesTable,
  affiliateLinksTable,
  openrouterUsageTable,
  creditTransactionsTable,
  systemActivityEventsTable,
  userCredentialsTable,
  platformSettingsTable,
  encryptionKeyRotationsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { adjustCredits, TIER_PRICES } from "../lib/credits";
import { getKeyRotationStatus, setKeyRotatedAt, setActiveKey, encryptWithKey, decryptWithKeyHex } from "../lib/crypto";
import {
  ListAdminUsersResponse,
  CreateAdminUserBody,
  ListAdminActivityResponse,
  CreateAdminActivityBody,
  ListSystemHealthResponse,
  RecordSystemHealthBody,
  GetAdminDashboardResponse,
  GetAdminAnalyticsResponse,
  GetAdminHealthResponse,
  GetAdminUsageByUserResponse,
  GetAdminRevenueResponse,
  TestAdminOpenRouterResponse,
  ListPlatformUsersResponse,
  ListPlatformUsersQueryParams,
  UpdatePlatformUserParams,
  UpdatePlatformUserBody,
  UpdatePlatformUserResponse,
  AdjustPlatformUserCreditsParams,
  AdjustPlatformUserCreditsBody,
  AdjustPlatformUserCreditsResponse,
  RotateCredentialKeyBody,
  RotateCredentialKeyResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Live OpenRouter reachability check used by the health card and the "test connection" action.
async function pingOpenRouter(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  modelsOnline: number | null;
  message: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, latencyMs: null, modelsOnline: null, message: "OPENROUTER_API_KEY is not configured" };
  }
  const start = Date.now();
  try {
    const resp = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const latencyMs = Date.now() - start;
    if (!resp.ok) {
      return { ok: false, latencyMs, modelsOnline: null, message: `OpenRouter returned HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as { data?: unknown[] };
    const modelsOnline = Array.isArray(data.data) ? data.data.length : null;
    return { ok: true, latencyMs, modelsOnline, message: "Connection stable" };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      modelsOnline: null,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

// ── Admin users (operator accounts) ─────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const rows = await db.select().from(adminUsersTable).orderBy(adminUsersTable.createdAt);
  res.json(ListAdminUsersResponse.parse(serialize(rows)));
});

router.post("/admin/users", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(adminUsersTable).values(parsed.data).returning();
  res.status(201).json(ListAdminUsersResponse.element.parse(serialize(row)));
});

router.get("/admin/activity", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  let query = db.select().from(adminActivityTable).orderBy(desc(adminActivityTable.createdAt)).limit(limit);

  if (req.query.adminId) {
    query = db
      .select()
      .from(adminActivityTable)
      .where(eq(adminActivityTable.adminId, Number(req.query.adminId)))
      .orderBy(desc(adminActivityTable.createdAt))
      .limit(limit) as typeof query;
  }

  const rows = await query;
  res.json(ListAdminActivityResponse.parse(serialize(rows)));
});

router.post("/admin/activity", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = CreateAdminActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(adminActivityTable).values(parsed.data).returning();
  res.status(201).json(ListAdminActivityResponse.element.parse(serialize(row)));
});

router.get("/admin/system-health", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const rows = await db.select().from(systemHealthTable).orderBy(desc(systemHealthTable.checkedAt)).limit(100);
  res.json(ListSystemHealthResponse.parse(serialize(rows)));
});

router.post("/admin/system-health", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = RecordSystemHealthBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(systemHealthTable).values(parsed.data).returning();
  res.status(201).json(ListSystemHealthResponse.element.parse(serialize(row)));
});

// ── Dashboard summary ────────────────────────────────────────────────────────
router.get("/admin/dashboard", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [
    [userCount],
    [blueprintCount],
    [toolCount],
    [instanceCount],
    [activeInstanceCount],
    [clickSum],
    [tokenSum],
    recentActivity,
    [insecureCredRow],
    latestRotations,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(blueprintsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(toolsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(systemInstancesTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.buildStatus, "active")),
    db
      .select({ total: sql<number>`coalesce(sum(${affiliateLinksTable.clickCount}), 0)::int` })
      .from(affiliateLinksTable),
    db
      .select({ total: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int` })
      .from(openrouterUsageTable),
    db.select().from(adminActivityTable).orderBy(desc(adminActivityTable.createdAt)).limit(10),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCredentialsTable)
      .where(sql`${userCredentialsTable.encryptedValue} not like 'gcm:%'`),
    db
      .select({ rotatedAt: encryptionKeyRotationsTable.rotatedAt })
      .from(encryptionKeyRotationsTable)
      .orderBy(desc(encryptionKeyRotationsTable.rotatedAt))
      .limit(1),
  ]);

  // Prefer the latest DB record; fall back to in-process override / env var.
  const latestDbRotation = latestRotations[0];
  const encryptionKeyStatus = latestDbRotation
    ? (() => {
        const THRESHOLD = 90;
        const rotatedAt = new Date(latestDbRotation.rotatedAt);
        const daysSince = Math.floor((Date.now() - rotatedAt.getTime()) / 86_400_000);
        return {
          lastRotatedAt: rotatedAt.toISOString(),
          daysSinceRotation: daysSince,
          warningThresholdDays: THRESHOLD,
          needsRotation: daysSince >= THRESHOLD,
        };
      })()
    : getKeyRotationStatus();

  res.json(
    GetAdminDashboardResponse.parse(
      serialize({
        totalUsers: userCount.count,
        totalBlueprints: blueprintCount.count,
        totalTools: toolCount.count,
        totalSystemInstances: instanceCount.count,
        activeSystemInstances: activeInstanceCount.count,
        totalAffiliateClicks: clickSum.total,
        openrouterTotalTokens: tokenSum.total,
        recentActivity,
        encryptionKeyStatus,
        insecureCredentialsCount: insecureCredRow?.count ?? 0,
      }),
    ),
  );
});

// ── Comprehensive analytics ──────────────────────────────────────────────────
router.get("/admin/analytics", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const [
    [userCount],
    [activeUserCount],
    [suspendedUserCount],
    [newToday],
    [newWeek],
    [activeMemberAgg],
    [instanceCount],
    [activeInstanceCount],
    [buildingInstanceCount],
    [clickSum],
    [aiAgg],
    [tokensHour],
    [req24],
    [creditAgg],
    [balanceAgg],
    modelRows,
    tierRows,
    growthRows,
    recentActivity,
    recentErrors,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.active, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.active, false)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, sql`date_trunc('day', now())`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, sql`now() - interval '7 days'`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.membershipStatus, "active")),
    db.select({ count: sql<number>`count(*)::int` }).from(systemInstancesTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.buildStatus, "active")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemInstancesTable)
      .where(sql`${systemInstancesTable.buildStatus} in ('building', 'pending', 'queued')`),
    db
      .select({ total: sql<number>`coalesce(sum(${affiliateLinksTable.clickCount}), 0)::int` })
      .from(affiliateLinksTable),
    db
      .select({
        totalTokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
        totalPromptTokens: sql<number>`coalesce(sum(${openrouterUsageTable.promptTokens}), 0)::int`,
        totalCompletionTokens: sql<number>`coalesce(sum(${openrouterUsageTable.completionTokens}), 0)::int`,
        totalRequests: sql<number>`count(*)::int`,
        successfulRequests: sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} = 'true' then 1 else 0 end), 0)::int`,
        failedRequests: sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} <> 'true' then 1 else 0 end), 0)::int`,
        totalCostUsd: sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
      })
      .from(openrouterUsageTable),
    db
      .select({ total: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int` })
      .from(openrouterUsageTable)
      .where(gte(openrouterUsageTable.createdAt, sql`now() - interval '1 hour'`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(openrouterUsageTable)
      .where(gte(openrouterUsageTable.createdAt, sql`now() - interval '24 hours'`)),
    db
      .select({
        totalConsumed: sql<number>`coalesce(sum(case when ${creditTransactionsTable.amount} < 0 then -${creditTransactionsTable.amount} else 0 end), 0)::int`,
        totalGranted: sql<number>`coalesce(sum(case when ${creditTransactionsTable.type} in ('signup_grant', 'tier_grant', 'admin_adjust') and ${creditTransactionsTable.amount} > 0 then ${creditTransactionsTable.amount} else 0 end), 0)::int`,
        totalPurchased: sql<number>`coalesce(sum(case when ${creditTransactionsTable.type} = 'purchase' then ${creditTransactionsTable.amount} else 0 end), 0)::int`,
      })
      .from(creditTransactionsTable),
    db
      .select({ outstanding: sql<number>`coalesce(sum(${usersTable.creditsBalance}), 0)::int` })
      .from(usersTable),
    db
      .select({
        model: openrouterUsageTable.model,
        requests: sql<number>`count(*)::int`,
        tokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
        promptTokens: sql<number>`coalesce(sum(${openrouterUsageTable.promptTokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${openrouterUsageTable.completionTokens}), 0)::int`,
        costUsd: sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
        successCount: sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} = 'true' then 1 else 0 end), 0)::int`,
        failureCount: sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} <> 'true' then 1 else 0 end), 0)::int`,
        creditsConsumed: sql<number>`coalesce((select -sum(ct.amount) from credit_transactions ct where ct.model = ${openrouterUsageTable.model} and ct.amount < 0), 0)::int`,
      })
      .from(openrouterUsageTable)
      .groupBy(openrouterUsageTable.model)
      .orderBy(desc(sql`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)`)),
    db
      .select({
        tier: sql<string>`coalesce(${usersTable.membershipTier}, 'none')`,
        count: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(eq(usersTable.membershipStatus, "active"))
      .groupBy(sql`coalesce(${usersTable.membershipTier}, 'none')`),
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${usersTable.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(gte(usersTable.createdAt, sql`now() - interval '14 days'`))
      .groupBy(sql`date_trunc('day', ${usersTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${usersTable.createdAt})`),
    db.select().from(adminActivityTable).orderBy(desc(adminActivityTable.createdAt)).limit(10),
    db
      .select({
        id: openrouterUsageTable.id,
        userId: openrouterUsageTable.userId,
        model: openrouterUsageTable.model,
        errorMessage: openrouterUsageTable.errorMessage,
        createdAt: openrouterUsageTable.createdAt,
      })
      .from(openrouterUsageTable)
      .where(sql`${openrouterUsageTable.success} <> 'true'`)
      .orderBy(desc(openrouterUsageTable.createdAt))
      .limit(10),
  ]);

  const activeMembers = activeMemberAgg.count;
  const paidSubscribers = tierRows
    .filter((r) => (TIER_PRICES[r.tier] ?? 0) > 0)
    .reduce((sum, r) => sum + r.count, 0);
  const mrrCents = tierRows.reduce((sum, r) => sum + (TIER_PRICES[r.tier] ?? 0) * r.count, 0);
  const successRate = aiAgg.totalRequests > 0 ? (aiAgg.successfulRequests / aiAgg.totalRequests) * 100 : 0;

  res.json(
    GetAdminAnalyticsResponse.parse(
      serialize({
        platform: {
          totalUsers: userCount.count,
          activeUsers: activeUserCount.count,
          suspendedUsers: suspendedUserCount.count,
          newUsersToday: newToday.count,
          newUsersThisWeek: newWeek.count,
          paidSubscribers,
          activeMembers,
          mrrCents,
          totalSystemInstances: instanceCount.count,
          activeSystemInstances: activeInstanceCount.count,
          buildingSystemInstances: buildingInstanceCount.count,
          totalAffiliateClicks: clickSum.total,
        },
        ai: {
          totalTokens: aiAgg.totalTokens,
          totalPromptTokens: aiAgg.totalPromptTokens,
          totalCompletionTokens: aiAgg.totalCompletionTokens,
          totalRequests: aiAgg.totalRequests,
          successfulRequests: aiAgg.successfulRequests,
          failedRequests: aiAgg.failedRequests,
          successRate,
          totalCostUsd: aiAgg.totalCostUsd,
          tokensLastHour: tokensHour.total,
          requestsLast24h: req24.count,
        },
        credits: {
          totalConsumed: creditAgg.totalConsumed,
          totalGranted: creditAgg.totalGranted,
          totalPurchased: creditAgg.totalPurchased,
          outstandingBalance: balanceAgg.outstanding,
        },
        models: modelRows,
        subscriptions: tierRows,
        growth: growthRows,
        recentActivity,
        recentErrors,
      }),
    ),
  );
});

// ── Live service + runtime health ────────────────────────────────────────────
router.get("/admin/health", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const dbStart = Date.now();
  let dbOk = true;
  let dbMessage: string | null = "Operational";
  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    dbOk = false;
    dbMessage = err instanceof Error ? err.message : "Database error";
  }
  const dbLatency = Date.now() - dbStart;

  const orPing = await pingOpenRouter();

  const mem = process.memoryUsage();
  res.json(
    GetAdminHealthResponse.parse({
      services: [
        { name: "Database", status: dbOk ? "healthy" : "down", latencyMs: dbLatency, message: dbMessage },
        {
          name: "OpenRouter",
          status: orPing.ok ? "healthy" : "degraded",
          latencyMs: orPing.latencyMs,
          message: orPing.message,
        },
        { name: "API Server", status: "healthy", latencyMs: 0, message: "Operational" },
      ],
      runtime: {
        uptimeSeconds: process.uptime(),
        memoryUsedMb: mem.rss / 1048576,
        memoryTotalMb: os.totalmem() / 1048576,
        cpuLoad: os.loadavg()[0] ?? 0,
        nodeVersion: process.version,
      },
    }),
  );
});

// ── AI usage per user ────────────────────────────────────────────────────────
router.get("/admin/usage/by-user", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const rows = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      requests: sql<number>`coalesce(count(${openrouterUsageTable.id}), 0)::int`,
      tokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
      costUsd: sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
      creditsBalance: usersTable.creditsBalance,
    })
    .from(usersTable)
    .leftJoin(openrouterUsageTable, eq(openrouterUsageTable.userId, usersTable.id))
    .groupBy(usersTable.id)
    .orderBy(desc(sql`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)`))
    .limit(limit);
  res.json(GetAdminUsageByUserResponse.parse(serialize(rows)));
});

// ── Platform-wide revenue activity ───────────────────────────────────────────
router.get("/admin/revenue", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const filterUserId = req.query.userId ? Number(req.query.userId) : null;
  const filterSystemInstanceId = req.query.systemInstanceId ? Number(req.query.systemInstanceId) : null;

  // Resolve date-range window for the trend chart and scoped queries.
  // Priority: from/to (custom range) > days > default 30.
  const fromParam = typeof req.query.from === "string" ? req.query.from : null;
  const toParam = typeof req.query.to === "string" ? req.query.to : null;
  const daysParam = req.query.days ? Number(req.query.days) : null;

  // Validate date params — reject anything that isn't YYYY-MM-DD to prevent injection.
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (fromParam !== null && !ISO_DATE_RE.test(fromParam)) {
    res.status(400).json({ error: "from must be a date in YYYY-MM-DD format" });
    return;
  }
  if (toParam !== null && !ISO_DATE_RE.test(toParam)) {
    res.status(400).json({ error: "to must be a date in YYYY-MM-DD format" });
    return;
  }
  if (daysParam !== null && (!Number.isInteger(daysParam) || daysParam < 1 || daysParam > 3650)) {
    res.status(400).json({ error: "days must be an integer between 1 and 3650" });
    return;
  }

  // Build Date bounds — used as bound SQL parameters (no sql.raw).
  let rangeStartDate: Date;
  let rangeEndDate: Date;
  if (fromParam && toParam) {
    rangeStartDate = new Date(`${fromParam}T00:00:00.000Z`);
    rangeEndDate = new Date(`${toParam}T23:59:59.999Z`);
    if (isNaN(rangeStartDate.getTime()) || isNaN(rangeEndDate.getTime())) {
      res.status(400).json({ error: "Invalid date values for from or to" });
      return;
    }
    if (rangeStartDate > rangeEndDate) {
      res.status(400).json({ error: "from must not be later than to" });
      return;
    }
  } else {
    const days = daysParam ?? 30;
    rangeStartDate = new Date(Date.now() - days * 86_400_000);
    rangeEndDate = new Date();
  }

  const needsInstanceJoin = filterUserId !== null || filterSystemInstanceId !== null;

  // Build a base WHERE condition for revenue events.
  // Always require amountCents > 0. Optionally scope to a user or system instance.
  function buildWhere() {
    const conditions = [
      sql`${systemActivityEventsTable.amountCents} is not null and ${systemActivityEventsTable.amountCents} > 0`,
    ];
    if (filterSystemInstanceId !== null) {
      conditions.push(sql`${systemActivityEventsTable.systemInstanceId} = ${filterSystemInstanceId}`);
    }
    if (filterUserId !== null) {
      conditions.push(sql`${systemInstancesTable.userId} = ${filterUserId}`);
    }
    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  // WHERE that also restricts to the selected date range (for chart, byBlueprint, recentEvents).
  // rangeStartDate / rangeEndDate are JS Date objects — Drizzle binds them as parameters.
  function buildWhereInRange() {
    const conditions = [
      sql`${systemActivityEventsTable.amountCents} is not null and ${systemActivityEventsTable.amountCents} > 0`,
      sql`${systemActivityEventsTable.createdAt} >= ${rangeStartDate}`,
      sql`${systemActivityEventsTable.createdAt} <= ${rangeEndDate}`,
    ];
    if (filterSystemInstanceId !== null) {
      conditions.push(sql`${systemActivityEventsTable.systemInstanceId} = ${filterSystemInstanceId}`);
    }
    if (filterUserId !== null) {
      conditions.push(sql`${systemInstancesTable.userId} = ${filterUserId}`);
    }
    return and(...conditions);
  }

  // Stats query needs the instances join when filtering by userId.
  // Stats tiles (today / week / month / all-time) are always absolute-period snapshots;
  // we also include rangeCents = total within the selected window.
  const statsQuery = needsInstanceJoin
    ? db
        .select({
          allTimeCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
          todayCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= date_trunc('day', now()) then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          weekCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= now() - interval '7 days' then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          monthCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= now() - interval '30 days' then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          rangeCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= ${rangeStartDate} and ${systemActivityEventsTable.createdAt} <= ${rangeEndDate} then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          eventCount: sql<number>`count(*)::int`,
        })
        .from(systemActivityEventsTable)
        .innerJoin(systemInstancesTable, eq(systemInstancesTable.id, systemActivityEventsTable.systemInstanceId))
        .where(buildWhere())
    : db
        .select({
          allTimeCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
          todayCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= date_trunc('day', now()) then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          weekCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= now() - interval '7 days' then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          monthCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= now() - interval '30 days' then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          rangeCents: sql<number>`coalesce(sum(case when ${systemActivityEventsTable.createdAt} >= ${rangeStartDate} and ${systemActivityEventsTable.createdAt} <= ${rangeEndDate} then ${systemActivityEventsTable.amountCents} else 0 end), 0)::int`,
          eventCount: sql<number>`count(*)::int`,
        })
        .from(systemActivityEventsTable)
        .where(buildWhere());

  const [statsRows, byBlueprintRows, recentEventsRows, dailyRevenueResult] = await Promise.all([
    statsQuery,

    // Per-blueprint revenue breakdown — scoped to selected date range
    db
      .select({
        blueprintId: blueprintsTable.id,
        blueprintName: blueprintsTable.name,
        totalCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
        eventCount: sql<number>`count(*)::int`,
      })
      .from(systemActivityEventsTable)
      .innerJoin(systemInstancesTable, eq(systemInstancesTable.id, systemActivityEventsTable.systemInstanceId))
      .innerJoin(blueprintsTable, eq(blueprintsTable.id, systemInstancesTable.blueprintId))
      .where(buildWhereInRange())
      .groupBy(blueprintsTable.id, blueprintsTable.name)
      .orderBy(desc(sql`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`))
      .limit(10),

    // Recent revenue events — scoped to selected date range
    db
      .select({
        id: systemActivityEventsTable.id,
        systemInstanceId: systemActivityEventsTable.systemInstanceId,
        blueprintName: blueprintsTable.name,
        amountCents: systemActivityEventsTable.amountCents,
        description: systemActivityEventsTable.description,
        createdAt: systemActivityEventsTable.createdAt,
        userEmail: usersTable.email,
        userName: usersTable.name,
        systemInstanceName: systemInstancesTable.name,
      })
      .from(systemActivityEventsTable)
      .innerJoin(systemInstancesTable, eq(systemInstancesTable.id, systemActivityEventsTable.systemInstanceId))
      .innerJoin(blueprintsTable, eq(blueprintsTable.id, systemInstancesTable.blueprintId))
      .innerJoin(usersTable, eq(usersTable.id, systemInstancesTable.userId))
      .where(buildWhereInRange())
      .orderBy(desc(systemActivityEventsTable.createdAt))
      .limit(25),

    // Daily revenue trend — full date spine via generate_series so zero-revenue
    // days appear as 0 rather than being omitted, giving a continuous line.
    // Optional filter fragments are built separately so both filterSystemInstanceId
    // and filterUserId are applied independently and correctly in all combinations.
    (() => {
      const instanceCondition =
        filterSystemInstanceId !== null
          ? sql`AND sae.system_instance_id = ${filterSystemInstanceId}`
          : sql``;
      const userCondition =
        filterUserId !== null
          ? sql`AND sae.system_instance_id IN (SELECT id FROM system_instances WHERE user_id = ${filterUserId})`
          : sql``;
      return db.execute<{ date: string; amountCents: number }>(sql`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS date,
          coalesce(sum(sae.amount_cents), 0)::int AS "amountCents"
        FROM generate_series(
          ${rangeStartDate}::date,
          ${rangeEndDate}::date,
          '1 day'::interval
        ) AS d(day)
        LEFT JOIN system_activity_events sae
          ON date_trunc('day', sae.created_at) = d.day
          AND sae.amount_cents IS NOT NULL
          AND sae.amount_cents > 0
          AND sae.created_at >= ${rangeStartDate}
          AND sae.created_at <= ${rangeEndDate}
          ${instanceCondition}
          ${userCondition}
        GROUP BY d.day
        ORDER BY d.day
      `);
    })(),
  ]);

  const [statsRow] = statsRows;

  res.json(
    GetAdminRevenueResponse.parse(
      serialize({
        stats: {
          todayCents: statsRow?.todayCents ?? 0,
          weekCents: statsRow?.weekCents ?? 0,
          monthCents: statsRow?.monthCents ?? 0,
          allTimeCents: statsRow?.allTimeCents ?? 0,
          rangeCents: statsRow?.rangeCents ?? 0,
          eventCount: statsRow?.eventCount ?? 0,
        },
        byBlueprint: byBlueprintRows,
        recentEvents: recentEventsRows.map((e) => ({
          ...e,
          amountCents: e.amountCents ?? 0,
        })),
        dailyRevenue: dailyRevenueResult.rows,
      }),
    ),
  );
});

// ── Live OpenRouter connection test ──────────────────────────────────────────
router.post("/admin/openrouter/test", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const result = await pingOpenRouter();
  res.json(TestAdminOpenRouterResponse.parse(result));
});

// ── Credential key rotation ───────────────────────────────────────────────────
router.post("/admin/credentials/rotate-key", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const parsed = RotateCredentialKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { newKeyHex } = parsed.data;

  // Strict hex validation (OpenAPI schema only enforces length).
  if (!/^[0-9a-fA-F]{64}$/.test(newKeyHex)) {
    res.status(400).json({ error: "newKeyHex must be exactly 64 hexadecimal characters (0-9, a-f)." });
    return;
  }

  // Reject if the new key is the same as the current active key.
  const currentKeyHex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!currentKeyHex || currentKeyHex.length !== 64) {
    res.status(400).json({ error: "CREDENTIAL_ENCRYPTION_KEY is not configured on the server." });
    return;
  }
  if (newKeyHex === currentKeyHex) {
    res.status(400).json({ error: "The new key must be different from the current active key." });
    return;
  }

  const rows = await db
    .select({ id: userCredentialsTable.id, encryptedValue: userCredentialsTable.encryptedValue })
    .from(userCredentialsTable);

  const toRotate: Array<{ id: number; plaintext: string }> = [];
  let skippedCount = 0;
  const newKeyBuf = Buffer.from(newKeyHex, "hex");

  for (const row of rows) {
    // Try the new key first — if it works the row is already rotated.
    try {
      decryptWithKeyHex(row.encryptedValue, newKeyHex);
      skippedCount++;
      continue;
    } catch {
      // Expected: row was not encrypted with the new key yet.
    }

    // Decrypt with the current (old) key.
    try {
      const plaintext = decryptWithKeyHex(row.encryptedValue, currentKeyHex);
      toRotate.push({ id: row.id, plaintext });
    } catch (err) {
      req.log.error({ err, credentialId: row.id }, "rotate-key: failed to decrypt row with current key");
      res.status(400).json({
        error: `Credential row id=${row.id} could not be decrypted with the current key. Rotation aborted.`,
      });
      return;
    }
  }

  // Execute all re-encryptions in a single atomic transaction.
  if (toRotate.length > 0) {
    await db.transaction(async (tx) => {
      for (const { id, plaintext } of toRotate) {
        const newValue = encryptWithKey(plaintext, newKeyBuf);
        await tx
          .update(userCredentialsTable)
          .set({ encryptedValue: newValue, updatedAt: new Date() })
          .where(eq(userCredentialsTable.id, id));
      }
    });
  }

  const rotatedAt = new Date().toISOString();

  // 1. Switch the active key in-process so subsequent decrypt/encrypt uses the new key immediately.
  setActiveKey(newKeyHex);

  // 2. Insert an audit record into the dedicated rotation history table.
  await db.insert(encryptionKeyRotationsTable).values({
    rotatedAt: new Date(rotatedAt),
    rotatedByAdminId: admin.id,
    notes: `Admin-initiated rotation via API. Rotated ${toRotate.length} row(s), skipped ${skippedCount}.`,
  });

  // 3. Also persist to platform_settings as a backward-compatible fallback for any process that
  //    has not yet been updated to read from encryption_key_rotations.
  await db
    .insert(platformSettingsTable)
    .values({ key: "credential_key_rotated_at", value: rotatedAt, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value: rotatedAt, updatedAt: new Date() },
    });

  // 4. Update the in-process timestamp override so getKeyRotationStatus() reflects the new date.
  setKeyRotatedAt(rotatedAt);

  await db.insert(adminActivityTable).values({
    action: "rotate_credential_key",
    resourceType: "credentials",
    resourceId: "user_credentials",
    details: JSON.stringify({ rotatedCount: toRotate.length, skippedCount, byUserId: admin.id }),
  });

  res.json(
    RotateCredentialKeyResponse.parse({ rotatedCount: toRotate.length, skippedCount, rotatedAt }),
  );
});

// ── Platform user management ─────────────────────────────────────────────────
router.get("/admin/platform-users", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const q = ListPlatformUsersQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { search, role, status, page: rawPage, perPage: rawPerPage } = q.data;
  const page = rawPage && rawPage > 0 ? rawPage : 1;
  const perPage = rawPerPage && rawPerPage > 0 ? Math.min(rawPerPage, 200) : 25;

  const conditions = [];
  if (search) {
    conditions.push(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.name, `%${search}%`)));
  }
  if (role) conditions.push(eq(usersTable.role, role));
  if (status === "active") conditions.push(eq(usersTable.active, true));
  if (status === "suspended") conditions.push(eq(usersTable.active, false));
  const where = conditions.length ? and(...conditions) : undefined;

  const [[totalRow], items] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(usersTable).where(where),
    db
      .select()
      .from(usersTable)
      .where(where)
      .orderBy(desc(usersTable.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
  ]);

  res.json(ListPlatformUsersResponse.parse(serialize({ items, total: totalRow.total, page, perPage })));
});

router.patch("/admin/platform-users/:id", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const params = UpdatePlatformUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdatePlatformUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const set: Record<string, unknown> = {};
  if (body.data.role !== undefined) set.role = body.data.role;
  if (body.data.active !== undefined) set.active = body.data.active;
  if (body.data.name !== undefined) set.name = body.data.name;
  if (body.data.membershipTier !== undefined) set.membershipTier = body.data.membershipTier;
  if (body.data.membershipStatus !== undefined) set.membershipStatus = body.data.membershipStatus;

  if (Object.keys(set).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [row] = await db.update(usersTable).set(set).where(eq(usersTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(adminActivityTable).values({
    adminId: admin.id,
    action: "update_user",
    resourceType: "user",
    resourceId: String(params.data.id),
    details: JSON.stringify({ by: admin.id, changes: set }),
  });

  res.json(UpdatePlatformUserResponse.parse(serialize(row)));
});

router.post("/admin/platform-users/:id/credits", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const params = AdjustPlatformUserCreditsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdjustPlatformUserCreditsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const balance = await adjustCredits(params.data.id, body.data.delta, "admin_adjust", {
    reason: body.data.reason ?? `Admin adjustment by user #${admin.id}`,
  });

  await db.insert(adminActivityTable).values({
    adminId: admin.id,
    action: "adjust_credits",
    resourceType: "user",
    resourceId: String(params.data.id),
    details: JSON.stringify({ by: admin.id, delta: body.data.delta, reason: body.data.reason ?? null }),
  });

  res.json(
    AdjustPlatformUserCreditsResponse.parse({ userId: params.data.id, balance, delta: body.data.delta }),
  );
});

// ── AI cost analytics (dedicated endpoint for the AI Analytics tab) ──────────
router.get("/admin/ai-analytics", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const days = req.query.days ? Math.min(Math.max(Number(req.query.days), 1), 365) : 30;

  const [dailyResult, [totals], [monthCost], [todayCost], modelRows, tierRows] = await Promise.all([
    // Daily AI usage with generate_series so zero-request days appear
    db.execute(sql`
      SELECT
        to_char(d.day, 'YYYY-MM-DD')               AS date,
        coalesce(count(u.id)::int,      0)          AS requests,
        coalesce(sum(u.total_tokens)::int, 0)       AS tokens,
        coalesce(sum(u.estimated_cost)::float, 0)   AS cost_usd
      FROM generate_series(
        date_trunc('day', now()) - ((${days}::int - 1) * interval '1 day'),
        date_trunc('day', now()),
        interval '1 day'
      ) AS d(day)
      LEFT JOIN openrouter_usage u
             ON date_trunc('day', u.created_at) = d.day
      GROUP BY d.day
      ORDER BY d.day
    `),
    // All-time totals
    db.select({
      totalRequests:     sql<number>`count(*)::int`,
      totalTokens:       sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
      totalCostUsd:      sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
      successfulRequests: sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} = 'true' then 1 else 0 end), 0)::int`,
      failedRequests:    sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} <> 'true' then 1 else 0 end), 0)::int`,
    }).from(openrouterUsageTable),
    // This month
    db.select({
      costUsd: sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
      requests: sql<number>`count(*)::int`,
      tokens:   sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
    }).from(openrouterUsageTable)
      .where(gte(openrouterUsageTable.createdAt, sql`date_trunc('month', now())`)),
    // Today
    db.select({
      costUsd:  sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
      requests: sql<number>`count(*)::int`,
      tokens:   sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
    }).from(openrouterUsageTable)
      .where(gte(openrouterUsageTable.createdAt, sql`date_trunc('day', now())`)),
    // Per-model breakdown with cost
    db.select({
      model:        openrouterUsageTable.model,
      requests:     sql<number>`count(*)::int`,
      tokens:       sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
      promptTokens: sql<number>`coalesce(sum(${openrouterUsageTable.promptTokens}), 0)::int`,
      completionTokens: sql<number>`coalesce(sum(${openrouterUsageTable.completionTokens}), 0)::int`,
      costUsd:      sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
      successCount: sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} = 'true' then 1 else 0 end), 0)::int`,
      failureCount: sql<number>`coalesce(sum(case when ${openrouterUsageTable.success} <> 'true' then 1 else 0 end), 0)::int`,
    }).from(openrouterUsageTable)
      .groupBy(openrouterUsageTable.model)
      .orderBy(desc(sql`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)`)),
    // AI usage broken down by user membership tier
    db.select({
      tier:    usersTable.membershipTier,
      requests: sql<number>`count(${openrouterUsageTable.id})::int`,
      tokens:   sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
      costUsd:  sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)::float`,
    }).from(openrouterUsageTable)
      .innerJoin(usersTable, eq(openrouterUsageTable.userId, usersTable.id))
      .groupBy(usersTable.membershipTier)
      .orderBy(desc(sql`coalesce(sum(${openrouterUsageTable.estimatedCost}), 0)`)),
  ]);

  res.json({
    daily: (dailyResult.rows as any[]).map((r) => ({
      date:     r.date as string,
      requests: Number(r.requests),
      tokens:   Number(r.tokens),
      costUsd:  Number(r.cost_usd),
    })),
    totals: {
      totalRequests:     totals.totalRequests,
      totalTokens:       totals.totalTokens,
      totalCostUsd:      totals.totalCostUsd,
      successfulRequests: totals.successfulRequests,
      failedRequests:    totals.failedRequests,
    },
    thisMonth: { costUsd: monthCost.costUsd, requests: monthCost.requests, tokens: monthCost.tokens },
    today:     { costUsd: todayCost.costUsd, requests: todayCost.requests, tokens: todayCost.tokens },
    models:    modelRows,
    byTier:    tierRows,
    days,
  });
});

export default router;
