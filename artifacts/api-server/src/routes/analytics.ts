import { Router, type IRouter, type Response } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  systemInstancesTable,
  systemActivityEventsTable,
  blueprintsTable,
  blueprintCategoriesTable,
  creditUsageEventsTable,
  userAffiliateLinksTable,
  affiliateConversionsTable,
  notificationsTable,
} from "@workspace/db";
import { z } from "zod/v4";
import { getActiveCallerPayload, requireAdmin } from "../lib/auth";
import { complete } from "../lib/openrouter";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown): string => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function sendCsvOrJson(
  res: Response,
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[],
  format: string,
): void {
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(toCsv(headers, rows));
  } else {
    res.json(rows);
  }
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: n === 1 ? (points[0]?.y ?? 0) : 0, r2: 0 };
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const sumXY = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const sumXX = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  if (Math.abs(sumXX) < 1e-10) return { slope: 0, intercept: meanY, r2: 0 };
  const slope = sumXY / sumXX;
  const intercept = meanY - slope * meanX;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot < 1e-10 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2 };
}

// 1-hour in-memory cache for the public blueprint-performance endpoint
let bpPerfCache: { data: unknown; expiresAt: number } | null = null;

const DateRangeQuery = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

// ─── GET /api/analytics/me/revenue-by-day ────────────────────────────────────

router.get("/analytics/me/revenue-by-day", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const q = DateRangeQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const start = q.data.startDate ? new Date(q.data.startDate) : new Date(Date.now() - 30 * 86_400_000);
  const end   = q.data.endDate   ? new Date(q.data.endDate)   : new Date();

  const instances = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.userId, caller.id));

  const instanceIds = instances.map((i) => i.id);

  if (instanceIds.length === 0) {
    sendCsvOrJson(res as never, "revenue-by-day.csv", ["date", "totalCents", "count"], [], q.data.format);
    return;
  }

  const rows = await db
    .select({
      date:       sql<string>`to_char(date_trunc('day', ${systemActivityEventsTable.createdAt}), 'YYYY-MM-DD')`,
      totalCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      count:      sql<number>`count(*)::int`,
    })
    .from(systemActivityEventsTable)
    .where(
      and(
        inArray(systemActivityEventsTable.systemInstanceId, instanceIds),
        eq(systemActivityEventsTable.eventType, "revenue"),
        gte(systemActivityEventsTable.createdAt, start),
        lte(systemActivityEventsTable.createdAt, end),
      ),
    )
    .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`);

  sendCsvOrJson(res as never, "revenue-by-day.csv", ["date", "totalCents", "count"], rows as never, q.data.format);
});

// ─── GET /api/analytics/me/revenue-by-system ─────────────────────────────────

router.get("/analytics/me/revenue-by-system", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const q = DateRangeQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const start = q.data.startDate ? new Date(q.data.startDate) : new Date(Date.now() - 90 * 86_400_000);
  const end   = q.data.endDate   ? new Date(q.data.endDate)   : new Date();

  const rows = await db
    .select({
      systemInstanceId: systemInstancesTable.id,
      systemName:       systemInstancesTable.name,
      buildStatus:      systemInstancesTable.buildStatus,
      blueprintName:    blueprintsTable.name,
      totalCents:       sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      eventCount:       sql<number>`count(${systemActivityEventsTable.id})::int`,
      lastEventAt:      sql<string | null>`max(${systemActivityEventsTable.createdAt})`,
    })
    .from(systemInstancesTable)
    .leftJoin(systemActivityEventsTable, and(
      eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
      eq(systemActivityEventsTable.eventType, "revenue"),
      gte(systemActivityEventsTable.createdAt, start),
      lte(systemActivityEventsTable.createdAt, end),
    ))
    .leftJoin(blueprintsTable, eq(blueprintsTable.id, systemInstancesTable.blueprintId))
    .where(eq(systemInstancesTable.userId, caller.id))
    .groupBy(systemInstancesTable.id, blueprintsTable.name)
    .orderBy(desc(sql`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`));

  sendCsvOrJson(
    res as never,
    "revenue-by-system.csv",
    ["systemName", "blueprintName", "buildStatus", "totalCents", "eventCount", "lastEventAt"],
    rows as never,
    q.data.format,
  );
});

// ─── GET /api/analytics/me/revenue-by-category ───────────────────────────────

router.get("/analytics/me/revenue-by-category", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const q = DateRangeQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const start = q.data.startDate ? new Date(q.data.startDate) : new Date(Date.now() - 90 * 86_400_000);
  const end   = q.data.endDate   ? new Date(q.data.endDate)   : new Date();

  const rows = await db
    .select({
      categoryId:   blueprintCategoriesTable.id,
      categoryName: sql<string>`coalesce(${blueprintCategoriesTable.name}, 'Uncategorized')`,
      totalCents:   sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      systemCount:  sql<number>`count(distinct ${systemInstancesTable.id})::int`,
    })
    .from(systemInstancesTable)
    .leftJoin(systemActivityEventsTable, and(
      eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
      eq(systemActivityEventsTable.eventType, "revenue"),
      gte(systemActivityEventsTable.createdAt, start),
      lte(systemActivityEventsTable.createdAt, end),
    ))
    .leftJoin(blueprintsTable, eq(blueprintsTable.id, systemInstancesTable.blueprintId))
    .leftJoin(blueprintCategoriesTable, eq(blueprintCategoriesTable.id, blueprintsTable.categoryId))
    .where(eq(systemInstancesTable.userId, caller.id))
    .groupBy(blueprintCategoriesTable.id, blueprintCategoriesTable.name)
    .orderBy(desc(sql`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`));

  sendCsvOrJson(
    res as never,
    "revenue-by-category.csv",
    ["categoryName", "totalCents", "systemCount"],
    rows as never,
    q.data.format,
  );
});

// ─── GET /api/analytics/me/credit-efficiency ─────────────────────────────────

router.get("/analytics/me/credit-efficiency", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const q = DateRangeQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const start = q.data.startDate ? new Date(q.data.startDate) : new Date(Date.now() - 30 * 86_400_000);
  const end   = q.data.endDate   ? new Date(q.data.endDate)   : new Date();

  const [creditRows, revenueRows] = await Promise.all([
    db
      .select({
        date:            sql<string>`to_char(date_trunc('day', ${creditUsageEventsTable.createdAt}), 'YYYY-MM-DD')`,
        creditsConsumed: sql<number>`coalesce(sum(${creditUsageEventsTable.creditsConsumed}), 0)::int`,
        tokensUsed:      sql<number>`coalesce(sum(${creditUsageEventsTable.tokensUsed}), 0)::int`,
        eventCount:      sql<number>`count(*)::int`,
      })
      .from(creditUsageEventsTable)
      .where(and(
        eq(creditUsageEventsTable.userId, caller.id),
        gte(creditUsageEventsTable.createdAt, start),
        lte(creditUsageEventsTable.createdAt, end),
      ))
      .groupBy(sql`date_trunc('day', ${creditUsageEventsTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${creditUsageEventsTable.createdAt})`),
    db
      .select({
        date:         sql<string>`to_char(date_trunc('day', ${systemActivityEventsTable.createdAt}), 'YYYY-MM-DD')`,
        revenueCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      })
      .from(systemActivityEventsTable)
      .innerJoin(systemInstancesTable, eq(systemInstancesTable.id, systemActivityEventsTable.systemInstanceId))
      .where(and(
        eq(systemInstancesTable.userId, caller.id),
        eq(systemActivityEventsTable.eventType, "revenue"),
        gte(systemActivityEventsTable.createdAt, start),
        lte(systemActivityEventsTable.createdAt, end),
      ))
      .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`),
  ]);

  const revenueMap = new Map(revenueRows.map((r) => [r.date, r.revenueCents]));
  const rows = creditRows.map((r) => {
    const rev = revenueMap.get(r.date) ?? 0;
    return {
      ...r,
      revenueCents: rev,
      roiPercent: r.creditsConsumed > 0 ? Math.round(((rev / 100) / r.creditsConsumed) * 10000) / 100 : 0,
    };
  });

  sendCsvOrJson(
    res as never,
    "credit-efficiency.csv",
    ["date", "creditsConsumed", "tokensUsed", "revenueCents", "roiPercent", "eventCount"],
    rows as never,
    q.data.format,
  );
});

// ─── GET /api/analytics/me/affiliate-funnel ──────────────────────────────────

router.get("/analytics/me/affiliate-funnel", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const q = DateRangeQuery.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const rows = await db
    .select({
      linkId:       userAffiliateLinksTable.id,
      name:         userAffiliateLinksTable.name,
      url:          userAffiliateLinksTable.url,
      category:     userAffiliateLinksTable.category,
      clicks:       userAffiliateLinksTable.clickCount,
      conversions:  sql<number>`count(${affiliateConversionsTable.id})::int`,
      revenueCents: sql<number>`coalesce(sum(${affiliateConversionsTable.amountCents}), 0)::int`,
    })
    .from(userAffiliateLinksTable)
    .leftJoin(affiliateConversionsTable, eq(affiliateConversionsTable.linkId, userAffiliateLinksTable.id))
    .where(eq(userAffiliateLinksTable.userId, caller.id))
    .groupBy(userAffiliateLinksTable.id)
    .orderBy(desc(userAffiliateLinksTable.clickCount));

  const out = rows.map((r) => ({
    ...r,
    conversionRate:   r.clicks > 0 ? Math.round((r.conversions / r.clicks) * 10000) / 100 : 0,
    revenuePerClick:  r.clicks > 0 ? Math.round(r.revenueCents / r.clicks) : 0,
  }));

  sendCsvOrJson(
    res as never,
    "affiliate-funnel.csv",
    ["name", "category", "clicks", "conversions", "conversionRate", "revenueCents", "revenuePerClick"],
    out as never,
    q.data.format,
  );
});

// ─── GET /api/analytics/me/forecast ──────────────────────────────────────────

router.get("/analytics/me/forecast", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const instances = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.userId, caller.id));

  const instanceIds = instances.map((i) => i.id);

  if (instanceIds.length === 0) {
    res.json({ points: [], projections: { day30: 0, day60: 0, day90: 0 }, confidence: 0, slope: 0, dailyAvgCents: 0 });
    return;
  }

  const dailyRows = await db
    .select({
      date:       sql<string>`to_char(date_trunc('day', ${systemActivityEventsTable.createdAt}), 'YYYY-MM-DD')`,
      totalCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
    })
    .from(systemActivityEventsTable)
    .where(
      and(
        inArray(systemActivityEventsTable.systemInstanceId, instanceIds),
        eq(systemActivityEventsTable.eventType, "revenue"),
        gte(systemActivityEventsTable.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`);

  const firstDate = dailyRows.length > 0 ? new Date(dailyRows[0]!.date).getTime() : Date.now();
  const points = dailyRows.map((r) => ({
    x: Math.floor((new Date(r.date).getTime() - firstDate) / 86_400_000),
    y: r.totalCents,
  }));

  const { slope, intercept, r2 } = linearRegression(points);
  const today = Math.floor((Date.now() - firstDate) / 86_400_000);
  const project = (ahead: number) => Math.max(0, Math.round(slope * (today + ahead) + intercept));

  res.json({
    points: dailyRows,
    projections: { day30: project(30), day60: project(60), day90: project(90) },
    confidence: Math.round(r2 * 100),
    slope: Math.round(slope * 100) / 100,
    dailyAvgCents:
      dailyRows.length > 0
        ? Math.round(dailyRows.reduce((s, r) => s + r.totalCents, 0) / dailyRows.length)
        : 0,
  });
});

// ─── GET /api/analytics/blueprint-performance (public, 1hr cache) ─────────────

router.get("/analytics/blueprint-performance", async (_req, res): Promise<void> => {
  if (bpPerfCache && Date.now() < bpPerfCache.expiresAt) {
    res.json(bpPerfCache.data);
    return;
  }

  const rows = await db
    .select({
      blueprintId:       blueprintsTable.id,
      blueprintName:     blueprintsTable.name,
      categoryId:        blueprintCategoriesTable.id,
      categoryName:      blueprintCategoriesTable.name,
      totalActiveSystems: sql<number>`count(distinct ${systemInstancesTable.id})::int`,
      totalUsers:        sql<number>`count(distinct ${systemInstancesTable.userId})::int`,
      totalRevenueCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      revenueEventCount: sql<number>`count(${systemActivityEventsTable.id})::int`,
    })
    .from(blueprintsTable)
    .leftJoin(blueprintCategoriesTable, eq(blueprintCategoriesTable.id, blueprintsTable.categoryId))
    .leftJoin(systemInstancesTable, eq(systemInstancesTable.blueprintId, blueprintsTable.id))
    .leftJoin(systemActivityEventsTable, and(
      eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
      eq(systemActivityEventsTable.eventType, "revenue"),
    ))
    .where(sql`${blueprintsTable.status} in ('active', 'published')`)
    .groupBy(blueprintsTable.id, blueprintCategoriesTable.id, blueprintCategoriesTable.name)
    .orderBy(desc(sql`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`));

  const data = rows.map((r) => ({
    ...r,
    avgRevenuePerUserCents: r.totalUsers > 0 ? Math.round(r.totalRevenueCents / r.totalUsers) : 0,
    successRate: r.totalActiveSystems > 0
      ? Math.round((r.revenueEventCount > 0 ? r.totalUsers : 0) / r.totalActiveSystems * 100)
      : 0,
  }));

  bpPerfCache = { data, expiresAt: Date.now() + 60 * 60 * 1000 };
  res.json(data);
});

// ─── GET /api/analytics/admin/cohorts ────────────────────────────────────────

router.get("/analytics/admin/cohorts", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const rows = await db
    .select({
      cohortMonth:      sql<string>`to_char(date_trunc('month', ${usersTable.createdAt}), 'YYYY-MM')`,
      totalUsers:       sql<number>`count(distinct ${usersTable.id})::int`,
      usersWithSystems: sql<number>`count(distinct ${systemInstancesTable.userId})::int`,
      usersWithRevenue: sql<number>`count(distinct case when ${systemActivityEventsTable.id} is not null then ${usersTable.id} end)::int`,
      totalRevenueCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
    })
    .from(usersTable)
    .leftJoin(systemInstancesTable, eq(systemInstancesTable.userId, usersTable.id))
    .leftJoin(systemActivityEventsTable, and(
      eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
      eq(systemActivityEventsTable.eventType, "revenue"),
    ))
    .groupBy(sql`date_trunc('month', ${usersTable.createdAt})`)
    .orderBy(sql`date_trunc('month', ${usersTable.createdAt})`);

  const data = rows.map((r) => ({
    ...r,
    systemAdoptionRate: r.totalUsers > 0 ? Math.round((r.usersWithSystems / r.totalUsers) * 100) : 0,
    revenueActivationRate: r.totalUsers > 0 ? Math.round((r.usersWithRevenue / r.totalUsers) * 100) : 0,
    avgRevenueCents: r.usersWithRevenue > 0 ? Math.round(r.totalRevenueCents / r.usersWithRevenue) : 0,
  }));

  res.json(data);
});

// ─── GET /api/analytics/admin/ltv ────────────────────────────────────────────

router.get("/analytics/admin/ltv", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const rows = await db
    .select({
      cohortMonth:       sql<string>`to_char(date_trunc('month', ${usersTable.createdAt}), 'YYYY-MM')`,
      totalUsers:        sql<number>`count(distinct ${usersTable.id})::int`,
      totalRevenueCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      monthsOld:         sql<number>`greatest(1, extract(epoch from age(now(), date_trunc('month', min(${usersTable.createdAt}))) ) / 2592000)::int`,
    })
    .from(usersTable)
    .leftJoin(systemInstancesTable, eq(systemInstancesTable.userId, usersTable.id))
    .leftJoin(systemActivityEventsTable, and(
      eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
      eq(systemActivityEventsTable.eventType, "revenue"),
    ))
    .groupBy(sql`date_trunc('month', ${usersTable.createdAt})`)
    .orderBy(sql`date_trunc('month', ${usersTable.createdAt})`);

  const data = rows.map((r) => ({
    ...r,
    avgLtvCents: r.totalUsers > 0 ? Math.round(r.totalRevenueCents / r.totalUsers) : 0,
    monthlyAvgCents:
      r.totalUsers > 0 && r.monthsOld > 0
        ? Math.round(r.totalRevenueCents / r.totalUsers / r.monthsOld)
        : 0,
  }));

  res.json(data);
});

// ─── GET /api/analytics/admin/churn-risk ─────────────────────────────────────

router.get("/analytics/admin/churn-risk", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const limitVal = Math.min(Number(req.query.limit) || 50, 200);

  const rows = await db
    .select({
      userId:          usersTable.id,
      email:           usersTable.email,
      name:            usersTable.name,
      membershipTier:  usersTable.membershipTier,
      creditsBalance:  usersTable.creditsBalance,
      createdAt:       usersTable.createdAt,
      lastRevenueAt:   sql<string | null>`max(${systemActivityEventsTable.createdAt})`,
      totalRevenueCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      activeSystems:   sql<number>`count(distinct case when ${systemInstancesTable.buildStatus} = 'active' then ${systemInstancesTable.id} end)::int`,
      totalSystems:    sql<number>`count(distinct ${systemInstancesTable.id})::int`,
    })
    .from(usersTable)
    .leftJoin(systemInstancesTable, eq(systemInstancesTable.userId, usersTable.id))
    .leftJoin(systemActivityEventsTable, and(
      eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id),
      eq(systemActivityEventsTable.eventType, "revenue"),
    ))
    .where(eq(usersTable.active, true))
    .groupBy(usersTable.id)
    .orderBy(usersTable.createdAt);

  const now = Date.now();
  const scored = rows.map((r) => {
    const lastActivityMs = r.lastRevenueAt
      ? new Date(r.lastRevenueAt).getTime()
      : new Date(r.createdAt).getTime();
    const daysSince = Math.floor((now - lastActivityMs) / 86_400_000);
    let score = 1;
    if (daysSince > 60) score += 3;
    else if (daysSince > 30) score += 2;
    else if (daysSince > 14) score += 1;
    if (r.activeSystems === 0) score += 3;
    if (r.totalRevenueCents === 0) score += 2;
    if ((r.creditsBalance ?? 0) < 10) score += 1;
    return {
      ...serialize(r),
      churnRiskScore: Math.min(10, score),
      daysSinceLastRevenue: daysSince,
    };
  });

  scored.sort((a, b) => (b.churnRiskScore as number) - (a.churnRiskScore as number));
  res.json(scored.slice(0, limitVal));
});

// ─── POST /api/analytics/admin/weekly-digest ─────────────────────────────────

router.post("/analytics/admin/weekly-digest", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .innerJoin(systemInstancesTable, eq(systemInstancesTable.userId, usersTable.id))
    .where(eq(usersTable.active, true))
    .groupBy(usersTable.id);

  let sent = 0;
  const errors: string[] = [];
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  for (const user of users) {
    try {
      const instances = await db
        .select({ id: systemInstancesTable.id, name: systemInstancesTable.name, buildStatus: systemInstancesTable.buildStatus })
        .from(systemInstancesTable)
        .where(eq(systemInstancesTable.userId, user.id));

      const instanceIds = instances.map((i) => i.id);

      const [revenueRow] = await db
        .select({
          total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(systemActivityEventsTable)
        .where(and(
          inArray(systemActivityEventsTable.systemInstanceId, instanceIds.length > 0 ? instanceIds : [-1]),
          eq(systemActivityEventsTable.eventType, "revenue"),
          gte(systemActivityEventsTable.createdAt, weekAgo),
        ));

      const activeSystems = instances.filter((i) => i.buildStatus === "active").length;
      const weeklyRevenue = (revenueRow?.total ?? 0) / 100;
      const context = `User: ${user.name ?? user.email}. Active systems: ${activeSystems}/${instances.length}. Revenue last 7 days: $${weeklyRevenue.toFixed(2)} (${revenueRow?.count ?? 0} events). Systems: ${instances.map((i) => `${i.name} (${i.buildStatus})`).join(", ")}.`;

      const result = await complete({
        userId: user.id,
        prompt: `Write a concise, motivating 2–3 sentence "What's Working" weekly digest for this SBEP user. Mention a specific win if there is revenue, and suggest one concrete next action. Context: ${context}`,
        model: "openai/gpt-4o-mini",
        systemPrompt: "You are the SBEP AI advisor. Write short, encouraging, actionable weekly digests. Be specific and upbeat. No fluff.",
      });

      if (result.content) {
        await db.insert(notificationsTable).values({
          userId: user.id,
          title: "Your Weekly Digest — What's Working",
          message: result.content,
          notificationType: "info",
          read: false,
        });
        sent++;
      }
    } catch (err) {
      errors.push(`User ${user.id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  res.json({ sent, total: users.length, errors: errors.slice(0, 10) });
});

export default router;
