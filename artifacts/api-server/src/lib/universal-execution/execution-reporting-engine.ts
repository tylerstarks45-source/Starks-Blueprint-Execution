// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Execution Reporting Engine
// Produces immutable execution reports at session completion.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { ueExecutionReports, executionTimelines } from "@workspace/db/schema";
import type { ExecutionNodeRecord, ExecutionHealth, ExecutionSessionSummary } from "./types";
import { computeSessionHealth, deriveSessionStatus } from "./state-engine";

const logger = { warn: console.warn.bind(console) };

/**
 * Produce an immutable execution report and a timeline record.
 * Persists both to DB. Returns the session summary for the EB bridge.
 */
export async function generateExecutionReport(
  sessionId: string,
  businessId: number,
  workflowId: string | null,
  nodes: ExecutionNodeRecord[],
  sessionStartedAt: Date
): Promise<ExecutionSessionSummary> {
  const now = Date.now();
  const durationMs = now - sessionStartedAt.getTime();

  const completedCount  = nodes.filter(n => n.status === "succeeded").length;
  const failedCount     = nodes.filter(n => n.status === "failed").length;
  const rolledBackCount = nodes.filter(n => n.status === "rolled_back").length;
  const cancelledCount  = nodes.filter(n => n.status === "cancelled").length;
  const nodeCount       = nodes.length;

  const successRate: number = nodeCount > 0 ? completedCount / nodeCount : 1.0;
  const health: ExecutionHealth = computeSessionHealth(nodeCount, completedCount, failedCount, rolledBackCount);
  const status = deriveSessionStatus(nodeCount, completedCount, failedCount, rolledBackCount, cancelledCount);

  const summary =
    `Execution complete. ${nodeCount} nodes processed: ` +
    `${completedCount} succeeded, ${failedCount} failed, ${rolledBackCount} rolled back. ` +
    `Health: ${health}. Duration: ${Math.round(durationMs / 1000)}s.`;

  // ── Execution report ──────────────────────────────────────────────────────
  try {
    await db.insert(ueExecutionReports).values({
      id: `erpt-${randomUUID()}`,
      sessionId,
      businessId,
      nodeCount,
      completedCount,
      failedCount,
      rolledBackCount,
      successRate: String(successRate.toFixed(4)),
      executionHealth: health,
      durationMs,
      executiveSummary: summary,
      reportData: {
        nodes: nodes.map(n => ({
          id: n.id,
          title: n.nodeTitle,
          type: n.nodeType,
          phase: n.phase,
          status: n.status,
          durationMs: n.durationMs,
          isCritical: n.isCritical,
        })),
      },
    });
  } catch (err) {
    logger.warn({ err, sessionId }, "execution-reporting-engine: report insert failed");
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  try {
    const progressPct = nodeCount > 0 ? (completedCount + failedCount + rolledBackCount) / nodeCount : 1.0;
    await db.insert(executionTimelines).values({
      id: `etl-${randomUUID()}`,
      sessionId,
      businessId,
      nodeCount,
      completedCount,
      failedCount,
      rolledBackCount,
      totalDurationMs: durationMs,
      estimatedRemainingMs: 0,
      progressPct: String(progressPct.toFixed(4)),
      timelineData: {
        phaseBreakdown: buildPhaseBreakdown(nodes),
        nodeSequence: nodes.map(n => ({ id: n.id, title: n.nodeTitle, phase: n.phase, status: n.status, durationMs: n.durationMs })),
      },
    });
  } catch (err) {
    logger.warn({ err, sessionId }, "execution-reporting-engine: timeline insert failed");
  }

  return {
    sessionId,
    businessId,
    workflowId,
    status,
    nodeCount,
    completedNodeCount: completedCount,
    failedNodeCount: failedCount,
    rolledBackNodeCount: rolledBackCount,
    successRate,
    executionHealth: health,
    durationMs,
    executiveSummary: summary,
    createdAt: sessionStartedAt,
  };
}

function buildPhaseBreakdown(nodes: ExecutionNodeRecord[]): Record<string, { total: number; succeeded: number; failed: number }> {
  const breakdown: Record<string, { total: number; succeeded: number; failed: number }> = {};
  for (const n of nodes) {
    if (!breakdown[n.phase]) breakdown[n.phase] = { total: 0, succeeded: 0, failed: 0 };
    breakdown[n.phase]!.total++;
    if (n.status === "succeeded") breakdown[n.phase]!.succeeded++;
    if (n.status === "failed" || n.status === "rolled_back") breakdown[n.phase]!.failed++;
  }
  return breakdown;
}
