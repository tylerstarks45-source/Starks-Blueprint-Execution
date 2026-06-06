import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db, systemInstancesTable, systemHealthTable, systemActivityEventsTable } from "@workspace/db";
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

  const rows = await db
    .select()
    .from(systemInstancesTable)
    .where(and(...conditions))
    .orderBy(systemInstancesTable.createdAt);

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
