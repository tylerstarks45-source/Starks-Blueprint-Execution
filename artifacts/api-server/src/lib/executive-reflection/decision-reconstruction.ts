// ─── Decision Reconstruction Engine (Build 012) ──────────────────────────────
//
// Rebuilds the executive decision timeline from recorded history only.
// No inference. No AI. No guessing.
//
// Consumes: observations from the case's chain, execution history events,
// and any persisted timeline events already stored.
//
// Pure logic — all DB reads go through reflection-registry.ts.

import type {
  CaseTimelineEvent,
  DecisionTimeline,
  TimelineEventCategory,
  ExecutiveCase,
} from "./types";

// ── Source event shape (generic — covers obs, execution events, etc.) ─────────

export interface SourceEvent {
  id: string;
  eventType: string;
  eventCategory: TimelineEventCategory;
  description?: string | null;
  sourceObjectId?: string | null;
  sourceObjectType?: string | null;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

// ── Timeline builder ───────────────────────────────────────────────────────────

/**
 * Merge events from multiple sources into a single chronological timeline.
 * Deterministic: sorts by occurredAt ascending, then sequence-numbers each event.
 * Returns CaseTimelineEvent records ready to be inserted.
 */
export function buildTimeline(
  caseId: string,
  events: SourceEvent[],
): Omit<CaseTimelineEvent, "id">[] {
  const sorted = [...events].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );

  return sorted.map((evt, index) => ({
    caseId,
    sequenceNumber: index + 1,
    eventType: evt.eventType,
    eventCategory: evt.eventCategory,
    eventDescription: evt.description ?? deriveDescription(evt),
    sourceObjectId: evt.sourceObjectId ?? null,
    sourceObjectType: evt.sourceObjectType ?? null,
    observedAt: evt.occurredAt,
    metadata: evt.metadata ?? {},
  }));
}

// ── Description derivation ─────────────────────────────────────────────────────

function deriveDescription(evt: SourceEvent): string {
  const obj = evt.sourceObjectId
    ? `${evt.sourceObjectType ?? "object"}:${evt.sourceObjectId.slice(0, 8)}`
    : evt.sourceObjectType ?? "system";
  return `[${evt.eventCategory}] ${evt.eventType} — ${obj}`;
}

// ── Source event factories ─────────────────────────────────────────────────────

/** Convert an Observation to a timeline SourceEvent. */
export function observationToTimelineEvent(obs: {
  id: string;
  eventType: string;
  eventCategory: string;
  sourceObjectId?: string | null;
  sourceObjectType?: string | null;
  observedAt: Date;
  signalType?: string;
  severity?: string;
}): SourceEvent {
  return {
    id: obs.id,
    eventType: obs.eventType,
    eventCategory: obs.eventCategory as TimelineEventCategory,
    description: `[obs/${obs.signalType ?? "?"}] ${obs.eventType}${obs.severity ? ` (${obs.severity})` : ""}`,
    sourceObjectId: obs.sourceObjectId ?? null,
    sourceObjectType: obs.sourceObjectType ?? null,
    occurredAt: obs.observedAt,
    metadata: { signalType: obs.signalType, severity: obs.severity },
  };
}

/** Convert an Execution history row to a timeline SourceEvent. */
export function executionEventToTimelineEvent(evt: {
  id: string;
  executionId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  occurredAt: Date;
}): SourceEvent {
  return {
    id: evt.id,
    eventType: evt.eventType,
    eventCategory: "execution",
    description: evt.fromStatus && evt.toStatus
      ? `Execution ${evt.executionId.slice(0, 8)}: ${evt.fromStatus} → ${evt.toStatus}`
      : `Execution ${evt.executionId.slice(0, 8)}: ${evt.eventType}`,
    sourceObjectId: evt.executionId,
    sourceObjectType: "execution",
    occurredAt: evt.occurredAt,
    metadata: { fromStatus: evt.fromStatus, toStatus: evt.toStatus },
  };
}

// ── Timeline summary ───────────────────────────────────────────────────────────

export function summarizeTimeline(events: CaseTimelineEvent[]): DecisionTimeline {
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const categoryCounts: Record<string, number> = {};
  for (const e of sorted) {
    categoryCounts[e.eventCategory] = (categoryCounts[e.eventCategory] ?? 0) + 1;
  }
  return {
    caseId: sorted[0]?.caseId ?? "",
    events: sorted,
    totalEvents: sorted.length,
    firstEventAt: sorted[0]?.observedAt ?? null,
    lastEventAt: sorted[sorted.length - 1]?.observedAt ?? null,
    categoryCounts,
  };
}

// ── Context evolution analysis ─────────────────────────────────────────────────

export interface ContextEvolution {
  totalContextShifts: number;
  categories: string[];
  firstCategory: string | null;
  lastCategory: string | null;
}

export function analyzeContextEvolution(events: CaseTimelineEvent[]): ContextEvolution {
  const contextShifts = events.filter((e) => e.eventCategory === "context");
  const categories = contextShifts.map((e) => e.eventType);
  return {
    totalContextShifts: contextShifts.length,
    categories,
    firstCategory: categories[0] ?? null,
    lastCategory: categories[categories.length - 1] ?? null,
  };
}

// ── Reasoning sequence reconstruction ─────────────────────────────────────────

export interface ReasoningSequence {
  steps: string[];
  totalSteps: number;
  hasGoalFormation: boolean;
  hasPlanGeneration: boolean;
  hasExecution: boolean;
  hasObservation: boolean;
}

export function reconstructReasoningSequence(events: CaseTimelineEvent[]): ReasoningSequence {
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const steps = sorted.map((e) => `[${String(e.sequenceNumber).padStart(3, "0")}] ${e.eventDescription ?? e.eventType}`);
  return {
    steps,
    totalSteps: steps.length,
    hasGoalFormation:  sorted.some((e) => e.eventCategory === "goal"),
    hasPlanGeneration: sorted.some((e) => e.eventCategory === "planning"),
    hasExecution:      sorted.some((e) => e.eventCategory === "execution"),
    hasObservation:    sorted.some((e) => e.eventCategory === "observation"),
  };
}
