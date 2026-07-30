// ─── Executive Brain ↔ Observation Integration (Build 011) ───────────────────
//
// Bridges the Executive Brain's execution output to the Observation Engine.
// Three functions:
//   fetchObservationSummary  — reads a lightweight summary for the context note
//   publishBrainObservation  — publishes the brain cycle itself as an observation
//   buildObservationAdvisory — assembles an advisory string for the context note
//
// Observation NEVER changes execution, plans, goals, or memory state.
// This integration layer is read-only + append-only.

import { logger } from "../logger";
import {
  getRecentObservations,
  getAttentionQueue,
  getAnomalyFeed,
  getTrendFeed,
  ingestObservation,
} from "../executive-observation/observation-services";
import { aggregateSignalTypes } from "../executive-observation/observation-signal";
import type {
  ObservationSummary,
  ObservationSignalType,
} from "../executive-observation/types";

// ── Fetch observation summary ──────────────────────────────────────────────────

export async function fetchObservationSummary(
  userId: number,
): Promise<ObservationSummary | null> {
  try {
    const [recent, highAttention, anomalies, trends] = await Promise.all([
      getRecentObservations(userId, 30),
      getAttentionQueue(userId, 0.7, 10),
      getAnomalyFeed(userId, true, 5),
      getTrendFeed(userId, 5),
    ]);

    const topSignals = aggregateSignalTypes(recent).slice(0, 5) as ObservationSignalType[];
    const latestChainId = recent.find((o) => o.chainId)?.chainId ?? null;

    const summaryParts: string[] = [];
    if (recent.length > 0)        summaryParts.push(`${recent.length} recent observation(s)`);
    if (highAttention.length > 0) summaryParts.push(`${highAttention.length} high-attention event(s)`);
    if (anomalies.length > 0)     summaryParts.push(`${anomalies.length} unresolved anomal${anomalies.length === 1 ? "y" : "ies"}`);
    if (trends.length > 0)        summaryParts.push(`${trends.length} active trend(s)`);
    if (topSignals.length > 0)    summaryParts.push(`top signals: ${topSignals.slice(0, 3).join(", ")}`);

    return {
      recentCount: recent.length,
      highAttentionCount: highAttention.length,
      topSignals,
      activeAnomalyCount: anomalies.length,
      activeTrendCount: trends.length,
      latestChainId,
      summaryText: summaryParts.join(" | ") || "No observations yet",
    };
  } catch (err) {
    logger.warn({ err }, "Observation: summary fetch failed (non-fatal)");
    return null;
  }
}

// ── Publish the brain cycle itself as an observation ──────────────────────────

export async function publishBrainObservation(opts: {
  userId: number;
  goalId?: string;
  planId?: string;
  executionId?: string;
  contextSnapshotId?: string;
  judgmentId?: string;
  requestId?: string;
}): Promise<void> {
  try {
    await ingestObservation({
      userId: opts.userId,
      sourceSystem: "executive-brain",
      sourceObjectType: "brain_cycle",
      eventType: "brain_cycle_completed",
      eventCategory: "reasoning",
      severity: "info",
      relatedGoalId: opts.goalId,
      relatedPlanId: opts.planId,
      relatedExecutionId: opts.executionId,
      relatedContextId: opts.contextSnapshotId,
      relatedJudgmentId: opts.judgmentId,
      relatedUserRequestId: opts.requestId,
      payload: {
        goalId: opts.goalId ?? null,
        planId: opts.planId ?? null,
        executionId: opts.executionId ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err }, "Observation: brain cycle publish failed (non-fatal)");
  }
}

// ── Advisory ───────────────────────────────────────────────────────────────────

export function buildObservationAdvisory(summary: ObservationSummary | null): string | null {
  if (!summary || summary.recentCount === 0) return null;
  const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
  return clip(`Executive observation: ${summary.summaryText}`, 500);
}
