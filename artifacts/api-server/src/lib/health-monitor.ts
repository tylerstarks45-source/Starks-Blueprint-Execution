import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  systemInstancesTable,
  systemConnectorsTable,
  scheduledTasksTable,
  runtimeJobsTable,
  systemRevenueProvidersTable,
  publishedContentTable,
  systemHealthScoresTable,
  businessHealthMetricsTable,
  businessesTable,
  businessConnectionsTable,
  businessHealthScoresTable,
  monitoringLogEventsTable,
  type HealthIssue,
  type HealthStatusLevel,
} from "@workspace/db";
import { logger } from "./logger";

// ─── Shared scoring helpers ────────────────────────────────────────────────
// Heuristic, DB-signal-based scoring — intentionally lightweight (no live
// network calls on the periodic tick). Root-cause research for novel
// failures is explicitly out of scope for this task; these dimensions exist
// to surface "here's what's wrong" plus feed the self-healing whitelist.

function ratioScore(ok: number, total: number, neutralWhenEmpty = 85): number {
  if (total === 0) return neutralWhenEmpty;
  return Math.round((ok / total) * 100);
}

function statusToLevel(score: number): HealthStatusLevel {
  if (score < 50) return "critical";
  if (score < 75) return "degraded";
  return "healthy";
}

interface ScoreSet {
  connectionScore: number;
  hostingScore: number;
  apiScore: number;
  seoScore: number;
  performanceScore: number;
  securityScore: number;
  revenueScore: number;
  automationScore: number;
}

function buildIssues(scores: ScoreSet, extra: HealthIssue[] = []): HealthIssue[] {
  const issues: HealthIssue[] = [...extra];
  const dims: [keyof ScoreSet, HealthIssue["dimension"]][] = [
    ["connectionScore", "connection"],
    ["hostingScore", "hosting"],
    ["apiScore", "api"],
    ["seoScore", "seo"],
    ["performanceScore", "performance"],
    ["securityScore", "security"],
    ["revenueScore", "revenue"],
    ["automationScore", "automation"],
  ];
  for (const [key, dimension] of dims) {
    const score = scores[key];
    if (score >= 75) continue;
    issues.push({
      dimension,
      severity: score < 50 ? "high" : "low",
      message: `${dimension} score is ${score}/100`,
      autoFixable: dimension === "connection" || dimension === "automation",
      autoFixed: false,
    });
  }
  return issues;
}

function overall(scores: ScoreSet): number {
  const vals = Object.values(scores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export async function logMonitoringEvent(input: {
  systemInstanceId?: number | null;
  businessId?: number | null;
  eventType: "health_check" | "self_heal" | "escalated";
  action?: string;
  status: "success" | "failed" | "skipped" | "escalated";
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(monitoringLogEventsTable).values({
    systemInstanceId: input.systemInstanceId ?? null,
    businessId: input.businessId ?? null,
    eventType: input.eventType,
    action: input.action ?? null,
    status: input.status,
    message: input.message,
    metadata: input.metadata ?? {},
  });
}

// ─── System instance health ────────────────────────────────────────────────

export async function computeSystemHealth(systemInstanceId: number) {
  const [instance] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));
  if (!instance) throw new Error(`System instance ${systemInstanceId} not found`);

  const connectors = await db
    .select()
    .from(systemConnectorsTable)
    .where(eq(systemConnectorsTable.systemInstanceId, systemInstanceId));
  const connectedCount = connectors.filter((c) => c.status === "connected").length;
  const connectionScore = ratioScore(connectedCount, connectors.length, 90);

  const hostingScore =
    instance.healthStatus === "healthy" ? 100 : instance.healthStatus === "degraded" ? 55 : instance.healthStatus === "unknown" ? 75 : 20;

  const recentJobs = await db
    .select()
    .from(runtimeJobsTable)
    .where(eq(runtimeJobsTable.systemInstanceId, systemInstanceId))
    .orderBy(desc(runtimeJobsTable.queuedAt))
    .limit(20);
  const settledJobs = recentJobs.filter((j) => j.status === "completed" || j.status === "failed");
  const apiScore = ratioScore(settledJobs.filter((j) => j.status === "completed").length, settledJobs.length, 90);

  const stuckOrFailed = recentJobs.filter((j) => j.status === "failed" || j.status === "active").length;

  const content = await db
    .select({ id: publishedContentTable.id })
    .from(publishedContentTable)
    .where(eq(publishedContentTable.systemInstanceId, systemInstanceId))
    .limit(5);
  const seoScore = content.length > 0 ? 85 : 65;

  const scheduled = await db
    .select()
    .from(scheduledTasksTable)
    .where(eq(scheduledTasksTable.systemInstanceId, systemInstanceId));
  const avgFailures = scheduled.length
    ? scheduled.reduce((sum, t) => sum + (t.failureCount ?? 0), 0) / scheduled.length
    : 0;
  const performanceScore = Math.max(10, Math.round(100 - Math.min(80, avgFailures * 20)));

  const errorConnectors = connectors.filter((c) => c.status === "error").length;
  const securityScore = Math.max(10, 100 - errorConnectors * 15);

  const revenueProviders = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(eq(systemRevenueProvidersTable.systemInstanceId, systemInstanceId));
  const revenueScore = revenueProviders.length === 0
    ? 60
    : revenueProviders.every((p) => p.syncStatus === "idle" || p.syncStatus === "success")
      ? 90
      : 55;

  const enabledScheduled = scheduled.filter((t) => t.enabled);
  const automationScore = enabledScheduled.length
    ? ratioScore(enabledScheduled.filter((t) => t.lastRunStatus === "success" || t.lastRunStatus === null).length, enabledScheduled.length, 85)
    : 80;

  const scores: ScoreSet = {
    connectionScore,
    hostingScore,
    apiScore,
    seoScore,
    performanceScore,
    securityScore,
    revenueScore,
    automationScore,
  };

  const extraIssues: HealthIssue[] = [];
  if (stuckOrFailed > 0) {
    extraIssues.push({
      dimension: "automation",
      severity: stuckOrFailed > 2 ? "high" : "low",
      message: `${stuckOrFailed} recent job(s) failed or are stuck`,
      autoFixable: true,
      autoFixed: false,
    });
  }

  const issues = buildIssues(scores, extraIssues);
  const overallScore = overall(scores);
  const status = statusToLevel(overallScore);

  const [row] = await db
    .insert(systemHealthScoresTable)
    .values({ systemInstanceId, overallScore, status, issues, ...scores })
    .returning();

  await logMonitoringEvent({
    systemInstanceId,
    eventType: "health_check",
    status: "success",
    message: `Recomputed health for system instance ${systemInstanceId}: ${overallScore}/100 (${status})`,
    metadata: { overallScore, status, issueCount: issues.length },
  });

  return row;
}

export async function getLatestSystemHealth(systemInstanceId: number) {
  const [row] = await db
    .select()
    .from(systemHealthScoresTable)
    .where(eq(systemHealthScoresTable.systemInstanceId, systemInstanceId))
    .orderBy(desc(systemHealthScoresTable.computedAt))
    .limit(1);
  return row ?? null;
}

export async function getSystemHealthHistory(systemInstanceId: number, limit = 20) {
  return db
    .select()
    .from(systemHealthScoresTable)
    .where(eq(systemHealthScoresTable.systemInstanceId, systemInstanceId))
    .orderBy(desc(systemHealthScoresTable.computedAt))
    .limit(limit);
}

// ─── Business health ────────────────────────────────────────────────────────

export async function computeBusinessHealth(businessId: number) {
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!business) throw new Error(`Business ${businessId} not found`);

  const connections = await db
    .select()
    .from(businessConnectionsTable)
    .where(eq(businessConnectionsTable.businessId, businessId));
  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const connectionScore = ratioScore(connectedCount, connections.length, 85);

  // If the business is backed by a system instance, borrow that system's
  // hosting/api/automation signals rather than re-deriving them.
  let hostingScore = business.websiteUrl ? 80 : 60;
  let apiScore = 85;
  let automationScore = 80;
  let performanceScore = 80;
  let extraIssues: HealthIssue[] = [];

  if (business.systemInstanceId) {
    const systemLatest = await getLatestSystemHealth(business.systemInstanceId);
    if (systemLatest) {
      hostingScore = systemLatest.hostingScore;
      apiScore = systemLatest.apiScore;
      automationScore = systemLatest.automationScore;
      performanceScore = systemLatest.performanceScore;
      extraIssues = (systemLatest.issues as HealthIssue[]).filter((i) => i.severity === "high");
    }
  }

  // Latest ASH narrative analysis (if any) informs seo/security proxies —
  // reuse rather than duplicate the LLM-driven scoring.
  const [latestAi] = await db
    .select()
    .from(businessHealthScoresTable)
    .where(eq(businessHealthScoresTable.businessId, businessId))
    .orderBy(desc(businessHealthScoresTable.createdAt))
    .limit(1);

  const seoScore = latestAi?.seoScore ?? 65;
  const revenueScore = latestAi?.growthScore ?? 60;
  const securityScore = connections.some((c) => c.status === "error") ? 55 : 90;

  const scores: ScoreSet = {
    connectionScore,
    hostingScore,
    apiScore,
    seoScore,
    performanceScore,
    securityScore,
    revenueScore,
    automationScore,
  };

  const issues = buildIssues(scores, extraIssues);
  const overallScore = overall(scores);
  const status = statusToLevel(overallScore);

  const [row] = await db
    .insert(businessHealthMetricsTable)
    .values({ businessId, overallScore, status, issues, ...scores })
    .returning();

  await logMonitoringEvent({
    businessId,
    systemInstanceId: business.systemInstanceId ?? null,
    eventType: "health_check",
    status: "success",
    message: `Recomputed health for business ${businessId}: ${overallScore}/100 (${status})`,
    metadata: { overallScore, status, issueCount: issues.length },
  });

  return row;
}

export async function getLatestBusinessHealth(businessId: number) {
  const [row] = await db
    .select()
    .from(businessHealthMetricsTable)
    .where(eq(businessHealthMetricsTable.businessId, businessId))
    .orderBy(desc(businessHealthMetricsTable.computedAt))
    .limit(1);
  return row ?? null;
}

export async function getBusinessHealthHistory(businessId: number, limit = 20) {
  return db
    .select()
    .from(businessHealthMetricsTable)
    .where(eq(businessHealthMetricsTable.businessId, businessId))
    .orderBy(desc(businessHealthMetricsTable.computedAt))
    .limit(limit);
}

// ─── Bulk recompute (used by the scheduler tick) ───────────────────────────

export async function recomputeAllActiveSystemsHealth(): Promise<number> {
  const rows = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(sql`${systemInstancesTable.buildStatus} in ('running', 'building')`);
  let count = 0;
  for (const { id } of rows) {
    try {
      await computeSystemHealth(id);
      count++;
    } catch (err) {
      logger.warn({ err, systemInstanceId: id }, "System health recompute failed");
    }
  }
  return count;
}

export async function recomputeAllActiveBusinessesHealth(): Promise<number> {
  const rows = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.status, "active"));
  let count = 0;
  for (const { id } of rows) {
    try {
      await computeBusinessHealth(id);
      count++;
    } catch (err) {
      logger.warn({ err, businessId: id }, "Business health recompute failed");
    }
  }
  return count;
}
