// ─── Shared Context Services (Build 006) ─────────────────────────────────────
//
// Reusable services that every Brain can call to access contextual awareness.
// No Brain owns Context — Context belongs to the Cognitive Operating System.
//
// Services:
//   getCurrentContext      — all active contexts for a user
//   getRelevantContext     — contexts filtered to an objective
//   getContextTimeline     — full historical audit trail
//   getContextSummary      — structured summary with counts and preview strings
//   getContextSnapshot     — retrieve a frozen snapshot by id
//   getContextDiagnostics  — health report for the full context system
//   getRecentSnapshots     — last N snapshots for a user

import { db, contextTimelineEventsTable, contextSnapshotsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../logger";
import { listContexts, getContext, getContextEntityLinks } from "./context-registry";
import { getSnapshot, getRecentSnapshots, resolveContextSnapshot } from "./context-resolution";
import { fireContextHooks, CONTEXT_EXTENSION_POINT_IDS } from "./context-extension-points";
import type {
  ExecutiveContextModel,
  ContextTimelineEvent,
  ContextSummary,
  ContextDiagnosticsReport,
  ContextHealthScore,
  ExecutiveContextSnapshot,
} from "./types";

export { getSnapshot, getRecentSnapshots } from "./context-resolution";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToTimelineEvent(
  row: typeof contextTimelineEventsTable.$inferSelect,
): ContextTimelineEvent {
  return {
    ...row,
    changedField: row.changedField ?? null,
    reason: row.reason ?? null,
  };
}

// ─── Current & Relevant Context ───────────────────────────────────────────────

/** Return all active contexts for a user.
 *  This is the "situational awareness" entry point for any Brain. */
export async function getCurrentContext(userId: number): Promise<ExecutiveContextModel[]> {
  return listContexts(userId, "active");
}

/** Return contexts relevant to a specific objective.
 *  Uses the same keyword-based scoring as the Resolution Engine.
 *  Future builds upgrade to semantic similarity without changing this signature. */
export async function getRelevantContext(
  userId: number,
  objective: string,
  limit = 5,
): Promise<ExecutiveContextModel[]> {
  // Short-circuit: delegate to resolveContextSnapshot with persist=false for consistency
  const snapshot = await resolveContextSnapshot(userId, objective, { persist: false });
  if (snapshot.contextIds.length === 0) return [];
  // Load the contributing contexts
  const results = await Promise.all(snapshot.contextIds.slice(0, limit).map(getContext));
  return results.filter((c): c is ExecutiveContextModel => c !== null);
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/** Return the full timeline of changes for a Context, newest first.
 *  Nothing overwrites history. History is always replayable. */
export async function getContextTimeline(
  contextId: string,
  limit = 100,
): Promise<ContextTimelineEvent[]> {
  const rows = await db
    .select()
    .from(contextTimelineEventsTable)
    .where(eq(contextTimelineEventsTable.contextId, contextId))
    .orderBy(desc(contextTimelineEventsTable.createdAt))
    .limit(limit);
  return rows.map(rowToTimelineEvent);
}

// ─── Context Summary ─────────────────────────────────────────────────────────

/** Return a structured summary for a Context — counts, previews, and timestamps.
 *  Designed as a lightweight "at-a-glance" payload for dashboard displays. */
export async function getContextSummary(contextId: string): Promise<ContextSummary | null> {
  const [context, links, timeline] = await Promise.all([
    getContext(contextId),
    getContextEntityLinks(contextId),
    getContextTimeline(contextId, 1),
  ]);

  if (!context) return null;

  // Count snapshots for this context (it may have contributed to many)
  const snapshotCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contextSnapshotsTable)
    .where(sql`${contextSnapshotsTable.contextIds} @> ${JSON.stringify([contextId])}::jsonb`);

  return {
    id: context.id,
    name: context.name,
    contextType: context.contextType,
    status: context.status,
    confidence: context.confidence,
    version: context.version,
    objectiveCount: context.objectives.length,
    constraintCount: context.constraints.length,
    priorityCount: context.priorities.length,
    riskCount: context.risks.length,
    entityLinkCount: links.length,
    snapshotCount: snapshotCountResult[0]?.count ?? 0,
    topObjectives: context.objectives.slice(0, 3),
    topPriorities: context.priorities.slice(0, 3),
    topConstraints: context.constraints.slice(0, 3),
    lastChangedAt: timeline[0]?.createdAt ?? context.updatedAt,
  };
}

// ─── Context Diagnostics & Health ─────────────────────────────────────────────

/** Compute a completeness score (0–100) for a context.
 *  Based on how many of the key dimensions are non-empty. */
function computeCompleteness(context: ExecutiveContextModel): number {
  const dimensions = [
    context.objectives,
    context.constraints,
    context.priorities,
    context.successCriteria,
    context.risks,
  ];
  const textFields = [context.purpose, context.mission, context.scope, context.description];

  const filledDimensions = dimensions.filter((d) => d.length > 0).length;
  const filledText = textFields.filter((f) => f && f.trim().length > 0).length;

  return Math.round(
    (filledDimensions / dimensions.length) * 70 + (filledText / textFields.length) * 30,
  );
}

/** Compute a freshness score (0–100) based on last update time. */
function computeFreshness(context: ExecutiveContextModel): number {
  const hoursAgo = (Date.now() - context.updatedAt.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) return 100;
  if (hoursAgo < 24) return 90;
  if (hoursAgo < 72) return 70;
  if (hoursAgo < 168) return 50; // 1 week
  if (hoursAgo < 720) return 30; // 1 month
  return 10;
}

/** Compute per-context health score. */
async function scoreContextHealth(context: ExecutiveContextModel): Promise<ContextHealthScore> {
  const links = await getContextEntityLinks(context.id);
  const completeness = computeCompleteness(context);
  const freshness = computeFreshness(context);
  const relationshipCoverage = Math.min(100, links.length * 20);
  const objectiveCoverage = context.objectives.length > 0 ? 100 : 0;
  const constraintCoverage = context.constraints.length > 0 ? 100 : 0;
  const versionIntegrity = context.version > 0 ? 100 : 0;

  const overallHealth = Math.round(
    completeness * 0.3 +
    freshness * 0.25 +
    relationshipCoverage * 0.15 +
    objectiveCoverage * 0.15 +
    constraintCoverage * 0.1 +
    versionIntegrity * 0.05,
  );

  return {
    contextId: context.id,
    name: context.name,
    completeness,
    freshness,
    relationshipCoverage,
    objectiveCoverage,
    constraintCoverage,
    versionIntegrity,
    overallHealth,
  };
}

/** Return a full diagnostics report for a user's context system.
 *  Measures completeness, freshness, coverage, and integrity. */
export async function getContextDiagnostics(userId: number): Promise<ContextDiagnosticsReport> {
  const [allContexts, recentSnapshots] = await Promise.all([
    listContexts(userId, undefined, 200),
    getRecentSnapshots(userId, 50),
  ]);

  const active = allContexts.filter((c) => c.status === "active");
  const drafts = allContexts.filter((c) => c.status === "draft");
  const archived = allContexts.filter((c) => c.status === "archived");

  // Score all non-archived contexts
  const scoreable = allContexts.filter((c) => c.status !== "archived");
  const scores = await Promise.all(scoreable.map(scoreContextHealth));

  const issues: string[] = [];
  if (active.length === 0) {
    issues.push("No active contexts — the Executive Brain has no situational awareness");
  }
  for (const score of scores) {
    if (score.completeness < 40) {
      issues.push(`Context "${score.name}" has low completeness (${score.completeness}%) — add objectives, constraints, and criteria`);
    }
    if (score.freshness < 30) {
      issues.push(`Context "${score.name}" was last updated over a month ago — consider reviewing`);
    }
  }

  const averageHealth =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.overallHealth, 0) / scores.length)
      : 0;

  let report: ContextDiagnosticsReport = {
    userId,
    totalContexts: allContexts.length,
    activeContexts: active.length,
    draftContexts: drafts.length,
    archivedContexts: archived.length,
    snapshotCount: recentSnapshots.length,
    averageHealth,
    contextScores: scores,
    issues,
    assessedAt: new Date(),
  };

  // Fire health-check extension hook (future Brains can add custom metrics)
  report = await fireContextHooks(CONTEXT_EXTENSION_POINT_IDS.HEALTH_CHECK, report);

  return report;
}
