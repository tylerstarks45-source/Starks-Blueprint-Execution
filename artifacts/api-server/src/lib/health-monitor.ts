import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  systemInstancesTable,
  systemConnectorsTable,
  scheduledTasksTable,
  runtimeJobsTable,
  systemRevenueProvidersTable,
  systemHealthScoresTable,
  businessHealthMetricsTable,
  businessesTable,
  businessConnectionsTable,
  businessHealthScoresTable,
  monitoringLogEventsTable,
  type HealthIssue,
  type HealthStatusLevel,
  type LogCategory,
  type LogSeverity,
} from "@workspace/db";
import { logger } from "./logger";
import { logEvent } from "./log-event";
import { insertHealthMetric } from "./governance/writes/health-writes";
import { actorFor, type GovernedWriteContext } from "./governance/types";

// ─── Shared scoring helpers ────────────────────────────────────────────────
// Heuristic, DB-signal-based scoring — intentionally lightweight (no live
// network calls on the periodic tick). Root-cause research for novel
// failures is explicitly out of scope for this task; these dimensions exist
// to surface "here's what's wrong" plus feed the self-healing whitelist.
// A dimension with no underlying signal is null ("not measured") rather than
// a neutral-looking default, so a business with no data never reads healthy.

function ratioScore(ok: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((ok / total) * 100);
}

export function statusToLevel(score: number | null): HealthStatusLevel {
  if (score == null) return "unknown";
  if (score < 50) return "critical";
  if (score < 75) return "degraded";
  return "healthy";
}

export interface ScoreSet {
  connectionScore: number | null;
  hostingScore: number | null;
  apiScore: number | null;
  seoScore: number | null;
  performanceScore: number | null;
  securityScore: number | null;
  revenueScore: number | null;
  automationScore: number | null;
}

export function buildIssues(scores: ScoreSet, extra: HealthIssue[] = []): HealthIssue[] {
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
    if (score == null || score >= 75) continue;
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

export function overall(scores: ScoreSet): number | null {
  const vals = Object.values(scores).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
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

  // Mirror into the unified logging center (best-effort, never throws).
  const category: LogCategory =
    input.eventType === "health_check" ? "maintenance" : input.eventType === "escalated" ? "recovery" : "recovery";
  const severity: LogSeverity =
    input.status === "failed"
      ? "error"
      : input.status === "escalated"
        ? "warning"
        : input.status === "skipped"
          ? "info"
          : "info";
  void logEvent({
    systemInstanceId: input.systemInstanceId ?? null,
    businessId: input.businessId ?? null,
    category,
    severity,
    component: "monitoring",
    action: input.action ?? input.eventType,
    message: input.message,
    metadata: { ...(input.metadata ?? {}), eventType: input.eventType, status: input.status },
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
  const connectionScore = ratioScore(connectedCount, connectors.length);

  const hostingScore =
    instance.healthStatus === "healthy" ? 100
      : instance.healthStatus === "degraded" ? 55
        : instance.healthStatus === "unknown" ? null
          : 20;

  const recentJobs = await db
    .select()
    .from(runtimeJobsTable)
    .where(eq(runtimeJobsTable.systemInstanceId, systemInstanceId))
    .orderBy(desc(runtimeJobsTable.queuedAt))
    .limit(20);
  const settledJobs = recentJobs.filter((j) => j.status === "completed" || j.status === "failed");
  const apiScore = ratioScore(settledJobs.filter((j) => j.status === "completed").length, settledJobs.length);

  const stuckOrFailed = recentJobs.filter((j) => j.status === "failed" || j.status === "active").length;

  // Whether content exists says nothing about search performance; SEO stays
  // unmeasured until a real crawl/search-console signal is wired in.
  const seoScore: number | null = null;

  const scheduled = await db
    .select()
    .from(scheduledTasksTable)
    .where(eq(scheduledTasksTable.systemInstanceId, systemInstanceId));
  const performanceScore = scheduled.length
    ? Math.max(10, Math.round(100 - Math.min(80, (scheduled.reduce((sum, t) => sum + (t.failureCount ?? 0), 0) / scheduled.length) * 20)))
    : null;

  const errorConnectors = connectors.filter((c) => c.status === "error").length;
  const securityScore = connectors.length ? Math.max(10, 100 - errorConnectors * 15) : null;

  const revenueProviders = await db
    .select()
    .from(systemRevenueProvidersTable)
    .where(eq(systemRevenueProvidersTable.systemInstanceId, systemInstanceId));
  const revenueScore = revenueProviders.length === 0
    ? null
    : revenueProviders.every((p) => p.syncStatus === "idle" || p.syncStatus === "success")
      ? 90
      : 55;

  const enabledScheduled = scheduled.filter((t) => t.enabled);
  const automationScore = enabledScheduled.length
    ? ratioScore(enabledScheduled.filter((t) => t.lastRunStatus === "success" || t.lastRunStatus === null).length, enabledScheduled.length)
    : null;

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
    message: `Recomputed health for system instance ${systemInstanceId}: ${overallScore ?? "not measured"}${overallScore == null ? "" : "/100"} (${status})`,
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
  const connectionScore = ratioScore(connectedCount, connections.length);

  // If the business is backed by a system instance, borrow that system's
  // hosting/api/automation signals rather than re-deriving them. Without one
  // there is nothing to measure them from.
  let hostingScore: number | null = null;
  let apiScore: number | null = null;
  let automationScore: number | null = null;
  let performanceScore: number | null = null;
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

  const seoScore = latestAi?.seoScore ?? null;
  const revenueScore = latestAi?.growthScore ?? null;
  const securityScore = connections.length === 0 ? null : connections.some((c) => c.status === "error") ? 55 : 90;

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

  // Heuristic monitoring recompute — no acting user, purely derived from
  // existing DB signals (see the file-level comment). Distinct sub-engine
  // from the AI-narrated businessHealthScoresTable insert in worker.ts.
  const ctx: GovernedWriteContext = {
    ownerUserId: business.ownerId,
    sourceEngine: "business_intelligence.health_monitor",
    actor: actorFor("system"),
    businessId,
  };
  const row = await insertHealthMetric(db, ctx, { businessId, overallScore, status, issues, ...scores });

  await logMonitoringEvent({
    businessId,
    systemInstanceId: business.systemInstanceId ?? null,
    eventType: "health_check",
    status: "success",
    message: `Recomputed health for business ${businessId}: ${overallScore ?? "not measured"}${overallScore == null ? "" : "/100"} (${status})`,
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
