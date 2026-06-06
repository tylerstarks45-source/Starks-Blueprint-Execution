import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, asc, gte, sql, count, ilike, inArray } from "drizzle-orm";
import { db, systemInstancesTable, systemHealthTable, systemActivityEventsTable } from "@workspace/db";
import { z } from "zod/v4";
import { getActiveCallerPayload, requireAuthActive } from "../lib/auth";
import {
  ListSystemInstancesResponse,
  GetSystemInstanceResponse,
  CreateSystemInstanceBody,
  UpdateSystemInstanceBody,
  GetSystemInstanceParams,
  UpdateSystemInstanceParams,
  DeleteSystemInstanceParams,
  ListSystemActivityEventsParams,
  ListSystemActivityEventsResponse,
  CreateSystemActivityEventParams,
  CreateSystemActivityEventBody,
  GetSystemRevenueParams,
  GetSystemRevenueResponse,
} from "@workspace/api-zod";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "admin"]);

const router: IRouter = Router();

const SORT_COLUMNS = {
  name:        systemInstancesTable.name,
  buildStatus: systemInstancesTable.buildStatus,
  updatedAt:   systemInstancesTable.updatedAt,
  createdAt:   systemInstancesTable.createdAt,
} as const;

router.get("/system-instances", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const isAdmin = ADMIN_ROLES.has(caller.role);
  const conditions = [];

  if (isAdmin && req.query.userId) {
    conditions.push(eq(systemInstancesTable.userId, Number(req.query.userId)));
  } else {
    conditions.push(eq(systemInstancesTable.userId, caller.id));
  }

  if (req.query.blueprintId) {
    conditions.push(eq(systemInstancesTable.blueprintId, Number(req.query.blueprintId)));
  }

  if (req.query.search) {
    conditions.push(ilike(systemInstancesTable.name, `%${req.query.search}%`));
  }

  if (req.query.status && req.query.status !== "all") {
    conditions.push(eq(systemInstancesTable.buildStatus, String(req.query.status)));
  }

  const sortKey = (req.query.sort as string) in SORT_COLUMNS
    ? (req.query.sort as keyof typeof SORT_COLUMNS)
    : "updatedAt";
  const orderDir = req.query.order === "asc" ? "asc" : "desc";
  const sortCol = SORT_COLUMNS[sortKey];
  const orderExpr = orderDir === "asc" ? asc(sortCol) : desc(sortCol);

  const limitVal  = Math.min(Math.max(Number(req.query.limit)  || 20, 1), 100);
  const offsetVal = Math.max(Number(req.query.offset) || 0, 0);

  const where = and(...conditions);

  const [countResult, rows] = await Promise.all([
    db.select({ total: count() }).from(systemInstancesTable).where(where),
    db
      .select()
      .from(systemInstancesTable)
      .where(where)
      .orderBy(orderExpr)
      .limit(limitVal)
      .offset(offsetVal),
  ]);

  const total = countResult[0]?.total ?? 0;
  res.setHeader("X-Total-Count", String(total));
  res.json(ListSystemInstancesResponse.parse(serialize(rows)));
});

router.post("/system-instances", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = CreateSystemInstanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(systemInstancesTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.get("/system-instances/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetSystemInstanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && row.userId !== null && row.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(GetSystemInstanceResponse.parse(serialize(row)));
});

router.patch("/system-instances/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = UpdateSystemInstanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateSystemInstanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && existing.userId !== null && existing.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [row] = await db
    .update(systemInstancesTable)
    .set(parsed.data)
    .where(eq(systemInstancesTable.id, params.data.id))
    .returning();
  res.json(GetSystemInstanceResponse.parse(serialize(row)));
});

// ─── GET /api/system-health/recent ───────────────────────────────────────────
// Auth-protected. Returns the last 10 platform service health check records,
// used as a proxy health sparkline in the system detail page.

router.get("/system-health/recent", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const rows = await db
    .select({
      id: systemHealthTable.id,
      service: systemHealthTable.service,
      status: systemHealthTable.status,
      message: systemHealthTable.message,
      checkedAt: systemHealthTable.checkedAt,
    })
    .from(systemHealthTable)
    .orderBy(desc(systemHealthTable.checkedAt))
    .limit(10);

  res.json(serialize(rows));
});

router.delete("/system-instances/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = DeleteSystemInstanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && existing.userId !== null && existing.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(systemInstancesTable).where(eq(systemInstancesTable.id, params.data.id));
  res.sendStatus(204);
});

// ─── GET /api/system-instances/:id/activity ──────────────────────────────────
// Returns the last 30 activity events for a system instance.

router.get("/system-instances/:id/activity", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = ListSystemActivityEventsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [instance] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && instance.userId !== null && instance.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(systemActivityEventsTable)
    .where(eq(systemActivityEventsTable.systemInstanceId, params.data.id))
    .orderBy(desc(systemActivityEventsTable.createdAt))
    .limit(30);

  res.json(ListSystemActivityEventsResponse.parse(serialize(rows)));
});

// ─── POST /api/system-instances/:id/activity ─────────────────────────────────
// Creates a new activity event for a system instance.

router.post("/system-instances/:id/activity", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = CreateSystemActivityEventParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = CreateSystemActivityEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && instance.userId !== null && instance.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [row] = await db
    .insert(systemActivityEventsTable)
    .values({
      systemInstanceId: params.data.id,
      eventType: parsed.data.eventType ?? "action",
      amountCents: parsed.data.amountCents ?? null,
      description: parsed.data.description,
      metadata: parsed.data.metadata ?? null,
    })
    .returning();

  res.status(201).json(serialize(row));
});

// ─── POST /api/system-instances/revenue-batch ────────────────────────────────
// Returns lifetime revenue cents for multiple system instances in one DB query.

const RevenueBatchBody = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

router.post("/system-instances/revenue-batch", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const body = RevenueBatchBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const { ids } = body.data;
  const isAdmin = ADMIN_ROLES.has(caller.role);

  // Verify ownership: fetch userId for each requested ID in one query
  const ownerRows = await db
    .select({ id: systemInstancesTable.id, userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(inArray(systemInstancesTable.id, ids));

  const allowedIds = ownerRows
    .filter(r => isAdmin || r.userId === caller.id)
    .map(r => r.id);

  if (allowedIds.length === 0) {
    res.json({});
    return;
  }

  // Single GROUP BY query to get lifetime revenue for all allowed IDs
  const rows = await db
    .select({
      systemInstanceId: systemActivityEventsTable.systemInstanceId,
      lifetimeCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
    })
    .from(systemActivityEventsTable)
    .where(
      and(
        inArray(systemActivityEventsTable.systemInstanceId, allowedIds),
        eq(systemActivityEventsTable.eventType, "revenue"),
      )
    )
    .groupBy(systemActivityEventsTable.systemInstanceId);

  // Build response map (include zeros for systems with no revenue events)
  const result: Record<string, number> = {};
  for (const id of allowedIds) {
    result[String(id)] = 0;
  }
  for (const row of rows) {
    if (row.systemInstanceId !== null) {
      result[String(row.systemInstanceId)] = Number(row.lifetimeCents);
    }
  }

  res.json(result);
});

// ─── GET /api/system-instances/:id/revenue ───────────────────────────────────
// Returns aggregated revenue stats and a 7-day trend for a system instance.

router.get("/system-instances/:id/revenue", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetSystemRevenueParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [instance] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, params.data.id));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && instance.userId !== null && instance.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const revenueCondition = and(
    eq(systemActivityEventsTable.systemInstanceId, params.data.id),
    eq(systemActivityEventsTable.eventType, "revenue"),
  );

  // Aggregate queries in parallel
  const [todayRows, weekRows, monthRows, lifetimeRows, trendRows] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, gte(systemActivityEventsTable.createdAt, startOfToday))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, gte(systemActivityEventsTable.createdAt, startOfWeek))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, gte(systemActivityEventsTable.createdAt, startOfMonth))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(revenueCondition),
    db
      .select({
        date: sql<string>`date_trunc('day', ${systemActivityEventsTable.createdAt})::date::text`,
        amountCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
      })
      .from(systemActivityEventsTable)
      .where(and(revenueCondition, gte(systemActivityEventsTable.createdAt, sevenDaysAgo)))
      .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`),
  ]);

  // Build a 7-day trend with zero-fill for missing days
  const trendMap = new Map<string, number>();
  for (const row of trendRows) {
    trendMap.set(row.date, Number(row.amountCents));
  }

  const trend: { date: string; amountCents: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({ date: key, amountCents: trendMap.get(key) ?? 0 });
  }

  const stats = {
    todayCents: Number(todayRows[0]?.total ?? 0),
    weekCents: Number(weekRows[0]?.total ?? 0),
    monthCents: Number(monthRows[0]?.total ?? 0),
    lifetimeCents: Number(lifetimeRows[0]?.total ?? 0),
    trend,
  };

  res.json(GetSystemRevenueResponse.parse(stats));
});

export default router;
