import { Router, type IRouter, type Response } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import {
  pool,
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
  publishedContentTable,
} from "@workspace/db";
import { z } from "zod/v4";
import { getActiveCallerPayload, requireAdmin } from "../lib/auth";
import { complete } from "../lib/openrouter";
import { sendWeeklyDigestEmail } from "../lib/email";
import { sendPushNotification } from "../lib/push";
import { logger } from "../lib/logger";

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

function linearRegression(points: { x: number; y: number }[]): {
  slope: number; intercept: number; r2: number; meanX: number; mse: number; sxx: number; n: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: n === 1 ? (points[0]?.y ?? 0) : 0, r2: 0, meanX: 0, mse: 0, sxx: 1, n };
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const sumXY = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const sxx   = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  if (Math.abs(sxx) < 1e-10) return { slope: 0, intercept: meanY, r2: 0, meanX, mse: 0, sxx: 1, n };
  const slope = sumXY / sxx;
  const intercept = meanY - slope * meanX;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2    = ssTot < 1e-10 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const mse   = n > 2 ? ssRes / (n - 2) : 0;
  return { slope, intercept, r2, meanX, mse, sxx, n };
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

  const start = q.data.startDate ? new Date(q.data.startDate) : new Date(Date.now() - 90 * 86_400_000);
  const end   = q.data.endDate   ? new Date(q.data.endDate)   : new Date();

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
    .leftJoin(affiliateConversionsTable, and(
      eq(affiliateConversionsTable.linkId, userAffiliateLinksTable.id),
      gte(affiliateConversionsTable.createdAt, start),
      lte(affiliateConversionsTable.createdAt, end),
    ))
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

  const { slope, intercept, r2, meanX, mse, sxx, n: nPts } = linearRegression(points);
  const today = Math.floor((Date.now() - firstDate) / 86_400_000);
  const projectRaw = (ahead: number) => Math.max(0, slope * (today + ahead) + intercept);

  // 95% prediction interval using t≈2.0 for conservative bounds
  const T95 = 2.0;
  const predictMargin = (ahead: number): number => {
    if (nPts < 3 || mse <= 0 || sxx <= 0) return 0;
    const x = today + ahead;
    return Math.round(T95 * Math.sqrt(mse * (1 + 1 / nPts + (x - meanX) ** 2 / sxx)));
  };

  const makeProjection = (ahead: number) => {
    const value  = Math.round(projectRaw(ahead));
    const margin = predictMargin(ahead);
    return { value, lower: Math.max(0, value - margin), upper: value + margin };
  };

  res.json({
    points: dailyRows,
    projections: { day30: makeProjection(30), day60: makeProjection(60), day90: makeProjection(90) },
    confidence: Math.round(r2 * 100),
    slope: Math.round(slope * 100) / 100,
    dailyAvgCents:
      dailyRows.length > 0
        ? Math.round(dailyRows.reduce((s, r) => s + r.totalCents, 0) / dailyRows.length)
        : 0,
  });
});

// ─── GET /api/analytics/blueprint-performance (public, 1hr cache) ─────────────

router.get("/analytics/blueprint-performance", async (req, res): Promise<void> => {
  const fmt = String(req.query.format ?? "json");

  if (fmt === "json" && bpPerfCache && Date.now() < bpPerfCache.expiresAt) {
    res.json(bpPerfCache.data);
    return;
  }

  // Main aggregation query — systemsWithRevenue counts distinct systems with any revenue earned
  const rows = await db
    .select({
      blueprintId:         blueprintsTable.id,
      blueprintName:       blueprintsTable.name,
      categoryId:          blueprintCategoriesTable.id,
      categoryName:        blueprintCategoriesTable.name,
      totalActiveSystems:  sql<number>`count(distinct ${systemInstancesTable.id})::int`,
      totalUsers:          sql<number>`count(distinct ${systemInstancesTable.userId})::int`,
      totalRevenueCents:   sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::int`,
      systemsWithRevenue:  sql<number>`count(distinct case when ${systemActivityEventsTable.amountCents} > 0 then ${systemInstancesTable.id} end)::int`,
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

  // Median days from system creation to first revenue event, per blueprint
  const medianRows = await pool.query<{ blueprint_id: number; median_days: number | null }>(
    `SELECT si.blueprint_id,
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (first_rev.min_rev_at - si.created_at)) / 86400.0
            ) AS median_days
     FROM system_instances si
     JOIN (
       SELECT system_instance_id, MIN(created_at) AS min_rev_at
       FROM system_activity_events
       WHERE event_type = 'revenue' AND amount_cents > 0
       GROUP BY system_instance_id
     ) first_rev ON first_rev.system_instance_id = si.id
     WHERE si.blueprint_id IS NOT NULL
     GROUP BY si.blueprint_id`,
  );
  const medianMap = new Map(
    medianRows.rows.map((r) => [r.blueprint_id, r.median_days != null ? Math.round(r.median_days) : null]),
  );

  const data = rows.map((r) => ({
    ...r,
    avgRevenuePerUserCents: r.totalUsers > 0 ? Math.round(r.totalRevenueCents / r.totalUsers) : 0,
    successRate: r.totalActiveSystems > 0
      ? Math.round((r.systemsWithRevenue / r.totalActiveSystems) * 100)
      : 0,
    medianDaysToFirstDollar: medianMap.get(r.blueprintId) ?? null,
  }));

  if (fmt === "json") bpPerfCache = { data, expiresAt: Date.now() + 60 * 60 * 1000 };

  sendCsvOrJson(
    res as never,
    "blueprint-performance.csv",
    ["blueprintName", "categoryName", "totalActiveSystems", "totalUsers", "totalRevenueCents",
     "systemsWithRevenue", "successRate", "avgRevenuePerUserCents", "medianDaysToFirstDollar"],
    data as never,
    fmt,
  );
});

// ─── GET /api/analytics/admin/cohorts ────────────────────────────────────────

router.get("/analytics/admin/cohorts", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const fmt = String(req.query.format ?? "json");

  // Use raw SQL so we can compute per-window retention in one pass
  const cohortRows = await pool.query<{
    cohort_month: string;
    total_users: number;
    users_with_systems: number;
    users_with_revenue: number;
    total_revenue_cents: number;
    retained_30d: number;
    retained_60d: number;
    retained_90d: number;
    retained_180d: number;
  }>(
    `SELECT
       to_char(date_trunc('month', u.created_at), 'YYYY-MM') AS cohort_month,
       COUNT(DISTINCT u.id)::int                              AS total_users,
       COUNT(DISTINCT si.user_id)::int                       AS users_with_systems,
       COUNT(DISTINCT CASE WHEN sae.amount_cents > 0 THEN u.id END)::int AS users_with_revenue,
       COALESCE(SUM(sae.amount_cents), 0)::int               AS total_revenue_cents,
       -- True retention: users who had ANY activity at/after the milestone window
       COUNT(DISTINCT CASE
         WHEN u.created_at + INTERVAL '30 days' <= now()
         AND EXISTS (
           SELECT 1 FROM system_instances si2
           JOIN system_activity_events sae2 ON sae2.system_instance_id = si2.id
           WHERE si2.user_id = u.id AND sae2.created_at >= u.created_at + INTERVAL '30 days'
         ) THEN u.id END)::int AS retained_30d,
       COUNT(DISTINCT CASE
         WHEN u.created_at + INTERVAL '60 days' <= now()
         AND EXISTS (
           SELECT 1 FROM system_instances si2
           JOIN system_activity_events sae2 ON sae2.system_instance_id = si2.id
           WHERE si2.user_id = u.id AND sae2.created_at >= u.created_at + INTERVAL '60 days'
         ) THEN u.id END)::int AS retained_60d,
       COUNT(DISTINCT CASE
         WHEN u.created_at + INTERVAL '90 days' <= now()
         AND EXISTS (
           SELECT 1 FROM system_instances si2
           JOIN system_activity_events sae2 ON sae2.system_instance_id = si2.id
           WHERE si2.user_id = u.id AND sae2.created_at >= u.created_at + INTERVAL '90 days'
         ) THEN u.id END)::int AS retained_90d,
       COUNT(DISTINCT CASE
         WHEN u.created_at + INTERVAL '180 days' <= now()
         AND EXISTS (
           SELECT 1 FROM system_instances si2
           JOIN system_activity_events sae2 ON sae2.system_instance_id = si2.id
           WHERE si2.user_id = u.id AND sae2.created_at >= u.created_at + INTERVAL '180 days'
         ) THEN u.id END)::int AS retained_180d
     FROM users u
     LEFT JOIN system_instances si ON si.user_id = u.id
     LEFT JOIN system_activity_events sae
       ON sae.system_instance_id = si.id AND sae.event_type = 'revenue'
     GROUP BY date_trunc('month', u.created_at)
     ORDER BY date_trunc('month', u.created_at)`,
  );

  const data = cohortRows.rows.map((r) => ({
    cohortMonth:           r.cohort_month,
    totalUsers:            r.total_users,
    usersWithSystems:      r.users_with_systems,
    usersWithRevenue:      r.users_with_revenue,
    totalRevenueCents:     r.total_revenue_cents,
    retained30d:           r.retained_30d,
    retained60d:           r.retained_60d,
    retained90d:           r.retained_90d,
    retained180d:          r.retained_180d,
    systemAdoptionRate:    r.total_users > 0 ? Math.round((r.users_with_systems / r.total_users) * 100) : 0,
    revenueActivationRate: r.total_users > 0 ? Math.round((r.users_with_revenue / r.total_users) * 100) : 0,
    avgRevenueCents:       r.users_with_revenue > 0 ? Math.round(r.total_revenue_cents / r.users_with_revenue) : 0,
    retention30dRate:      r.total_users > 0 ? Math.round((r.retained_30d  / r.total_users) * 100) : 0,
    retention60dRate:      r.total_users > 0 ? Math.round((r.retained_60d  / r.total_users) * 100) : 0,
    retention90dRate:      r.total_users > 0 ? Math.round((r.retained_90d  / r.total_users) * 100) : 0,
    retention180dRate:     r.total_users > 0 ? Math.round((r.retained_180d / r.total_users) * 100) : 0,
  }));

  sendCsvOrJson(
    res as never,
    "cohorts.csv",
    ["cohortMonth", "totalUsers", "usersWithSystems", "usersWithRevenue", "totalRevenueCents",
     "retained30d", "retained60d", "retained90d", "retained180d",
     "systemAdoptionRate", "revenueActivationRate", "avgRevenueCents",
     "retention30dRate", "retention60dRate", "retention90dRate", "retention180dRate"],
    data as never,
    fmt,
  );
});

// ─── GET /api/analytics/admin/ltv ────────────────────────────────────────────

router.get("/analytics/admin/ltv", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const fmt = String(req.query.format ?? "json");

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

  sendCsvOrJson(
    res as never,
    "ltv.csv",
    ["cohortMonth", "totalUsers", "totalRevenueCents", "monthsOld", "avgLtvCents", "monthlyAvgCents"],
    data as never,
    fmt,
  );
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

  const fmt = String(req.query.format ?? "json");
  scored.sort((a, b) => (b.churnRiskScore as number) - (a.churnRiskScore as number));
  const sliced = scored.slice(0, limitVal);

  sendCsvOrJson(
    res as never,
    "churn-risk.csv",
    ["email", "name", "membershipTier", "creditsBalance", "activeSystems", "totalSystems",
     "totalRevenueCents", "daysSinceLastRevenue", "churnRiskScore", "createdAt"],
    sliced as never,
    fmt,
  );
});

// ─── GET /api/analytics/admin/platform-funnel ────────────────────────────────

router.get("/analytics/admin/platform-funnel", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const fmt = String(req.query.format ?? "json");

  const [signupsRow, activatedRow, firstRevenueRow, highEarnersRow] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM users WHERE active = true`,
    ),
    pool.query<{ total: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS total FROM system_instances`,
    ),
    pool.query<{ total: number }>(
      `SELECT COUNT(DISTINCT si.user_id)::int AS total
       FROM system_instances si
       JOIN system_activity_events sae ON sae.system_instance_id = si.id
       WHERE sae.event_type = 'revenue' AND sae.amount_cents > 0`,
    ),
    pool.query<{ total: number }>(
      `SELECT COUNT(DISTINCT si.user_id)::int AS total
       FROM system_instances si
       JOIN system_activity_events sae ON sae.system_instance_id = si.id
       WHERE sae.event_type = 'revenue'
       GROUP BY si.user_id
       HAVING SUM(sae.amount_cents) >= 10000`,
    ),
  ]);

  const signups      = signupsRow.rows[0]?.total      ?? 0;
  const activated    = activatedRow.rows[0]?.total    ?? 0;
  const firstRevenue = firstRevenueRow.rows[0]?.total ?? 0;
  const highEarners  = highEarnersRow.rowCount ?? 0;

  const data = {
    signups,
    activated,
    firstRevenue,
    highEarners,
    conversion: {
      signupToActivated:        signups > 0     ? Math.round((activated    / signups)      * 100) : 0,
      activatedToFirstRevenue:  activated > 0   ? Math.round((firstRevenue / activated)    * 100) : 0,
      firstRevenueToHighEarner: firstRevenue > 0 ? Math.round((highEarners / firstRevenue) * 100) : 0,
      overall:                  signups > 0     ? Math.round((highEarners  / signups)      * 100) : 0,
    },
  };

  if (fmt === "csv") {
    sendCsvOrJson(
      res as never,
      "platform-funnel.csv",
      ["stage", "count", "conversionPct"],
      [
        { stage: "Signups",         count: signups,      conversionPct: 100 },
        { stage: "Activated",       count: activated,    conversionPct: data.conversion.signupToActivated },
        { stage: "First Revenue",   count: firstRevenue, conversionPct: data.conversion.activatedToFirstRevenue },
        { stage: "$100+ Earners",   count: highEarners,  conversionPct: data.conversion.firstRevenueToHighEarner },
      ],
      fmt,
    );
  } else {
    res.json(data);
  }
});

// ─── GET /api/analytics/admin/user-health ────────────────────────────────────

router.get("/analytics/admin/user-health", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const fmt       = String(req.query.format ?? "json");
  const limitVal  = Math.min(Number(req.query.limit) || 100, 500);

  const rows = await pool.query<{
    user_id: number;
    email: string;
    name: string | null;
    membership_tier: string;
    created_at: Date;
    total_lifetime_cents: number;
    first_revenue_at: Date | null;
    last_revenue_at: Date | null;
    active_systems: number;
    total_systems: number;
    monthly_avg_cents: number;
  }>(
    `SELECT
       u.id                                                       AS user_id,
       u.email,
       u.name,
       u.membership_tier,
       u.created_at,
       COALESCE(SUM(sae.amount_cents), 0)::int                   AS total_lifetime_cents,
       MIN(CASE WHEN sae.amount_cents > 0 THEN sae.created_at END) AS first_revenue_at,
       MAX(sae.created_at)                                        AS last_revenue_at,
       COUNT(DISTINCT CASE WHEN si.build_status = 'active' THEN si.id END)::int AS active_systems,
       COUNT(DISTINCT si.id)::int                                 AS total_systems,
       CASE WHEN GREATEST(1, EXTRACT(EPOCH FROM age(NOW(), u.created_at)) / 2592000) > 0
         THEN (COALESCE(SUM(sae.amount_cents), 0) /
               GREATEST(1, EXTRACT(EPOCH FROM age(NOW(), u.created_at)) / 2592000))::int
         ELSE 0 END                                               AS monthly_avg_cents
     FROM users u
     LEFT JOIN system_instances si ON si.user_id = u.id
     LEFT JOIN system_activity_events sae
       ON sae.system_instance_id = si.id AND sae.event_type = 'revenue'
     WHERE u.active = true
     GROUP BY u.id
     ORDER BY total_lifetime_cents DESC
     LIMIT $1`,
    [limitVal],
  );

  const now = Date.now();
  const data = rows.rows.map((r) => {
    const daysSinceLast = r.last_revenue_at
      ? Math.floor((now - new Date(r.last_revenue_at).getTime()) / 86_400_000)
      : null;
    const monthsOnPlatform =
      Math.max(1, Math.floor((now - new Date(r.created_at).getTime()) / (30 * 86_400_000)));

    let healthScore = 100;
    if (r.active_systems === 0)                  healthScore -= 30;
    if (r.total_lifetime_cents === 0)             healthScore -= 25;
    if (daysSinceLast != null && daysSinceLast > 60) healthScore -= 20;
    else if (daysSinceLast != null && daysSinceLast > 30) healthScore -= 10;
    if (r.total_systems === 0)                   healthScore -= 15;

    return {
      userId:               r.user_id,
      email:                r.email,
      name:                 r.name,
      membershipTier:       r.membership_tier,
      createdAt:            r.created_at,
      totalLifetimeCents:   r.total_lifetime_cents,
      monthlyAvgCents:      r.monthly_avg_cents,
      firstRevenueAt:       r.first_revenue_at,
      lastRevenueAt:        r.last_revenue_at,
      daysSinceLastRevenue: daysSinceLast,
      activeSystems:        r.active_systems,
      totalSystems:         r.total_systems,
      monthsOnPlatform,
      healthScore:          Math.max(0, healthScore),
    };
  });

  sendCsvOrJson(
    res as never,
    "user-health.csv",
    ["email", "name", "membershipTier", "totalLifetimeCents", "monthlyAvgCents",
     "activeSystems", "totalSystems", "daysSinceLastRevenue", "healthScore", "monthsOnPlatform"],
    data as never,
    fmt,
  );
});

// ─── POST /api/analytics/admin/weekly-digest ─────────────────────────────────

router.post("/analytics/admin/weekly-digest", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, expoPushToken: usersTable.expoPushToken })
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
        const activeSystems = instances.filter((i) => i.buildStatus === "active").length;
        const weeklyRevenueDollars = (revenueRow?.total ?? 0) / 100;

        // In-app notification
        await db.insert(notificationsTable).values({
          userId: user.id,
          title: "Your Weekly Digest — What's Working",
          message: result.content,
          notificationType: "info",
          read: false,
        });

        // Email delivery (fire-and-forget; Resend key may not be configured)
        sendWeeklyDigestEmail(
          user.email,
          user.name ?? user.email,
          result.content,
          { activeSystems, weeklyRevenueDollars },
        ).catch((err: unknown) => {
          logger.warn({ userId: user.id, err }, "Weekly digest email failed");
        });

        // Push notification (fire-and-forget)
        if (user.expoPushToken) {
          sendPushNotification(
            user.expoPushToken,
            "📊 Your Weekly Digest",
            result.content.slice(0, 150) + (result.content.length > 150 ? "…" : ""),
            { screen: "dashboard" },
          ).catch((err: unknown) => {
            logger.warn({ userId: user.id, err }, "Weekly digest push failed");
          });
        }

        sent++;
      }
    } catch (err) {
      errors.push(`User ${user.id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  res.json({ sent, total: users.length, errors: errors.slice(0, 10) });
});

export default router;
