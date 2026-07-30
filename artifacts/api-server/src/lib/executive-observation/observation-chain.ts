// ─── Observation Chain Engine (Build 011) ────────────────────────────────────
//
// Builds chronological cognitive timelines by linking related observations
// into named chains.
//
// A chain is anchored to one cognitive object (goal / plan / execution /
// user_request).  All observations for that object are threaded into the
// chain in chronological order, becoming a searchable cognitive timeline.
//
// Pure logic lives here; all DB reads/writes go through observation-registry.ts.

import type {
  ObservationChain,
  ExecutiveObservation,
  ObservationSignalType,
  ObservationSeverity,
} from "./types";

// ── Chain anchor resolution ───────────────────────────────────────────────────

/**
 * Given an ingested observation, determine which anchor object the chain
 * should be created/extended for.  Priority: execution > plan > goal >
 * user_request > source_object.
 */
export function resolveChainAnchor(
  obs: Pick<
    ExecutiveObservation,
    | "relatedExecutionId"
    | "relatedPlanId"
    | "relatedGoalId"
    | "relatedUserRequestId"
    | "sourceObjectId"
    | "sourceObjectType"
  >,
): { anchorObjectId: string; anchorObjectType: string } | null {
  if (obs.relatedExecutionId) {
    return { anchorObjectId: obs.relatedExecutionId, anchorObjectType: "execution" };
  }
  if (obs.relatedPlanId) {
    return { anchorObjectId: obs.relatedPlanId, anchorObjectType: "plan" };
  }
  if (obs.relatedGoalId) {
    return { anchorObjectId: obs.relatedGoalId, anchorObjectType: "goal" };
  }
  if (obs.relatedUserRequestId) {
    return { anchorObjectId: obs.relatedUserRequestId, anchorObjectType: "user_request" };
  }
  if (obs.sourceObjectId && obs.sourceObjectType) {
    return { anchorObjectId: obs.sourceObjectId, anchorObjectType: obs.sourceObjectType };
  }
  return null;
}

// ── Chain name generation ─────────────────────────────────────────────────────

export function generateChainName(
  anchorObjectType: string,
  anchorObjectId: string,
): string {
  const short = anchorObjectId.slice(0, 8);
  const typeLabel = anchorObjectType.replace(/_/g, " ");
  return `${typeLabel} chain — ${short}`;
}

// ── Chain aggregate update ─────────────────────────────────────────────────────

/**
 * Compute the updated chain aggregate fields after a new observation is added.
 * Returns only the fields that changed — caller merges into existing chain.
 */
export function updateChainAggregates(
  chain: ObservationChain,
  newObs: ExecutiveObservation,
): {
  observationCount: number;
  lastObservedAt: Date;
  firstObservedAt: Date;
  signalTypes: string[];
  maxSeverity: string;
  maxAttentionScore: number;
} {
  const newCount = chain.observationCount + 1;
  const now = newObs.observedAt;

  // Merge signal types (de-dup)
  const signalSet = new Set(chain.signalTypes);
  signalSet.add(newObs.signalType);

  // Update max severity
  const maxSev = dominantSeverity(chain.maxSeverity, newObs.severity);

  // Update max attention
  const maxAtt = Math.max(chain.maxAttentionScore, newObs.attentionScore);

  return {
    observationCount:  newCount,
    lastObservedAt:    now,
    firstObservedAt:   chain.firstObservedAt ?? now,
    signalTypes:       [...signalSet],
    maxSeverity:       maxSev,
    maxAttentionScore: Math.round(maxAtt * 1000) / 1000,
  };
}

// ── Severity ordering ─────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  info: 0, low: 1, medium: 2, high: 3, critical: 4,
};

function dominantSeverity(a: string, b: ObservationSeverity): string {
  return (SEVERITY_ORDER[a] ?? 0) >= (SEVERITY_ORDER[b] ?? 0) ? a : b;
}

// ── Chain summary ──────────────────────────────────────────────────────────────

export interface ChainSummary {
  chainId: string;
  name: string;
  anchorObjectType: string | null;
  observationCount: number;
  topSignals: ObservationSignalType[];
  maxSeverity: string;
  maxAttentionScore: number;
  firstObservedAt: Date | null;
  lastObservedAt: Date | null;
}

export function buildChainSummary(chain: ObservationChain): ChainSummary {
  return {
    chainId: chain.id,
    name: chain.name,
    anchorObjectType: chain.anchorObjectType,
    observationCount: chain.observationCount,
    topSignals: chain.signalTypes.slice(0, 5) as ObservationSignalType[],
    maxSeverity: chain.maxSeverity,
    maxAttentionScore: chain.maxAttentionScore,
    firstObservedAt: chain.firstObservedAt,
    lastObservedAt: chain.lastObservedAt,
  };
}

// ── Reflection readiness check ─────────────────────────────────────────────────

export const REFLECTION_MIN_OBSERVATIONS = 5;
export const REFLECTION_MIN_ATTENTION    = 0.7;

export function isChainReflectionReady(chain: ObservationChain): boolean {
  return (
    chain.observationCount >= REFLECTION_MIN_OBSERVATIONS &&
    chain.maxAttentionScore >= REFLECTION_MIN_ATTENTION
  );
}
