// ─── Correlation Engine (Build 011) ──────────────────────────────────────────
//
// Automatically correlates observations by:
//   same_goal, same_plan, same_execution, same_user_request,
//   time_window, shared_resource, shared_object.
//
// Correlation is deterministic. No AI.
// Pure logic — DB reads/writes go through observation-registry.ts.

import type {
  ExecutiveObservation,
  ObservationCorrelation,
  CorrelationType,
} from "./types";

// ── Correlation candidate ─────────────────────────────────────────────────────

export interface CorrelationCandidate {
  sourceObservationId: string;
  targetObservationId: string;
  correlationType: CorrelationType;
  strength: number;
  reason: string;
}

// ── Main correlation detector ─────────────────────────────────────────────────

/**
 * Given a new observation and a list of recent observations, return all
 * correlation edges that should be created.
 * Pure — no I/O.
 */
export function detectCorrelations(
  newObs: ExecutiveObservation,
  recentObservations: ExecutiveObservation[],
  timeWindowMs = 300_000,   // 5 minutes
): CorrelationCandidate[] {
  const candidates: CorrelationCandidate[] = [];
  const now = newObs.observedAt.getTime();

  for (const other of recentObservations) {
    if (other.id === newObs.id) continue;

    const otherTime = other.observedAt.getTime();
    const withinWindow = Math.abs(now - otherTime) <= timeWindowMs;

    // same_execution (strongest)
    if (
      newObs.relatedExecutionId &&
      other.relatedExecutionId &&
      newObs.relatedExecutionId === other.relatedExecutionId
    ) {
      candidates.push({
        sourceObservationId: newObs.id,
        targetObservationId: other.id,
        correlationType: "same_execution",
        strength: 1.0,
        reason: `Same execution: ${newObs.relatedExecutionId}`,
      });
      continue; // strongest correlation wins — don't add weaker ones for same pair
    }

    // same_plan
    if (
      newObs.relatedPlanId &&
      other.relatedPlanId &&
      newObs.relatedPlanId === other.relatedPlanId
    ) {
      candidates.push({
        sourceObservationId: newObs.id,
        targetObservationId: other.id,
        correlationType: "same_plan",
        strength: 0.9,
        reason: `Same plan: ${newObs.relatedPlanId}`,
      });
      continue;
    }

    // same_goal
    if (
      newObs.relatedGoalId &&
      other.relatedGoalId &&
      newObs.relatedGoalId === other.relatedGoalId
    ) {
      candidates.push({
        sourceObservationId: newObs.id,
        targetObservationId: other.id,
        correlationType: "same_goal",
        strength: 0.85,
        reason: `Same goal: ${newObs.relatedGoalId}`,
      });
      continue;
    }

    // same_user_request
    if (
      newObs.relatedUserRequestId &&
      other.relatedUserRequestId &&
      newObs.relatedUserRequestId === other.relatedUserRequestId
    ) {
      candidates.push({
        sourceObservationId: newObs.id,
        targetObservationId: other.id,
        correlationType: "same_user_request",
        strength: 0.8,
        reason: `Same user request: ${newObs.relatedUserRequestId}`,
      });
      continue;
    }

    // shared_object — same sourceObjectId from different sources
    if (
      newObs.sourceObjectId &&
      other.sourceObjectId &&
      newObs.sourceObjectId === other.sourceObjectId &&
      newObs.sourceObjectType === other.sourceObjectType
    ) {
      candidates.push({
        sourceObservationId: newObs.id,
        targetObservationId: other.id,
        correlationType: "shared_object",
        strength: 0.75,
        reason: `Shared object: ${newObs.sourceObjectType}:${newObs.sourceObjectId}`,
      });
      continue;
    }

    // time_window — same user, same category, within time window (weakest)
    if (
      withinWindow &&
      newObs.userId === other.userId &&
      newObs.eventCategory === other.eventCategory
    ) {
      candidates.push({
        sourceObservationId: newObs.id,
        targetObservationId: other.id,
        correlationType: "time_window",
        strength: 0.4,
        reason: `Time window: same category ${newObs.eventCategory} within ${timeWindowMs / 1000}s`,
      });
    }
  }

  // De-duplicate: one edge per (source, target) pair — keep highest strength
  const deduped = new Map<string, CorrelationCandidate>();
  for (const c of candidates) {
    const key = `${c.sourceObservationId}:${c.targetObservationId}`;
    const existing = deduped.get(key);
    if (!existing || c.strength > existing.strength) {
      deduped.set(key, c);
    }
  }

  return [...deduped.values()];
}

// ── Correlation cluster builder ────────────────────────────────────────────────

/**
 * Given a set of correlation edges, group observation IDs into clusters
 * (connected components via union-find).
 */
export function buildCorrelationClusters(
  edges: Array<{ sourceObservationId: string; targetObservationId: string }>,
): Map<string, string[]> {
  const parent = new Map<string, string>();

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }

  function union(a: string, b: string): void {
    parent.set(find(a), find(b));
  }

  for (const e of edges) {
    union(e.sourceObservationId, e.targetObservationId);
  }

  const clusters = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(id);
  }

  return clusters;
}
