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
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { adjustCredits, TIER_PRICES } from "../lib/credits";
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
  TestAdminOpenRouterResponse,
  ListPlatformUsersResponse,
  ListPlatformUsersQueryParams,
  UpdatePlatformUserParams,
  UpdatePlatformUserBody,
  UpdatePlatformUserResponse,
  AdjustPlatformUserCreditsParams,
  AdjustPlatformUserCreditsBody,
  AdjustPlatformUserCreditsResponse,
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
  ]);

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

// ── Live OpenRouter connection test ──────────────────────────────────────────
router.post("/admin/openrouter/test", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const result = await pingOpenRouter();
  res.json(TestAdminOpenRouterResponse.parse(result));
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
    adminId: null,
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
    adminId: null,
    action: "adjust_credits",
    resourceType: "user",
    resourceId: String(params.data.id),
    details: JSON.stringify({ by: admin.id, delta: body.data.delta, reason: body.data.reason ?? null }),
  });

  res.json(
    AdjustPlatformUserCreditsResponse.parse({ userId: params.data.id, balance, delta: body.data.delta }),
  );
});

export default router;
