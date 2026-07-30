// ─── Executive Factor Engine (Build 012) ─────────────────────────────────────
//
// Identifies major contributing factors across 9 categories.
// Each factor receives an influence score 0.00–1.00.
// No recommendations. Pure explanation.
// Pure computation — DB reads go through reflection-registry.ts.

import type {
  CaseTimelineEvent,
  ReflectionFactor,
  FactorCategory,
  FactorDirection,
} from "./types";

// ── Factor candidate ──────────────────────────────────────────────────────────

export interface FactorCandidate {
  factorCategory: FactorCategory;
  factorDescription: string;
  influenceScore: number;
  direction: FactorDirection;
  evidence: Record<string, unknown>[];
}

// ── Individual factor detectors ────────────────────────────────────────────────

function detectContextFactors(events: CaseTimelineEvent[]): FactorCandidate[] {
  const contextEvents = events.filter((e) => e.eventCategory === "context");
  if (contextEvents.length === 0) return [];

  const shifts = contextEvents.filter(
    (e) => e.eventType.includes("shift") || e.eventType.includes("updated"),
  ).length;

  if (shifts === 0 && contextEvents.length > 0) {
    return [{
      factorCategory: "context",
      factorDescription: `Context was stable throughout the case (${contextEvents.length} context event(s))`,
      influenceScore: 0.3,
      direction: "positive",
      evidence: contextEvents.slice(0, 3).map((e) => ({ eventId: e.id, eventType: e.eventType })),
    }];
  }

  return [{
    factorCategory: "context",
    factorDescription: `Context shifted ${shifts} time(s) during the case — may have affected planning and goal priority`,
    influenceScore: Math.min(1.0, 0.4 + shifts * 0.15),
    direction: shifts > 2 ? "negative" : "mixed",
    evidence: contextEvents.slice(0, 3).map((e) => ({ eventId: e.id, eventType: e.eventType })),
  }];
}

function detectGoalPriorityFactors(events: CaseTimelineEvent[]): FactorCandidate[] {
  const goalEvents = events.filter((e) => e.eventCategory === "goal");
  if (goalEvents.length === 0) return [];

  const goalChanges = goalEvents.filter(
    (e) => e.eventType.includes("updated") || e.eventType.includes("changed"),
  ).length;

  return [{
    factorCategory: "goal_priority",
    factorDescription: goalChanges > 0
      ? `Goal priority changed ${goalChanges} time(s) — may indicate unclear objectives`
      : `Goal priority remained stable (${goalEvents.length} goal event(s))`,
    influenceScore: goalChanges > 0 ? Math.min(1.0, 0.5 + goalChanges * 0.1) : 0.4,
    direction: goalChanges > 0 ? "negative" : "positive",
    evidence: goalEvents.slice(0, 3).map((e) => ({ eventId: e.id, eventType: e.eventType })),
  }];
}

function detectPlanningStrategyFactors(events: CaseTimelineEvent[]): FactorCandidate[] {
  const planEvents = events.filter((e) => e.eventCategory === "planning");
  if (planEvents.length === 0) return [];

  const generated = planEvents.filter((e) => e.eventType.includes("generated")).length;
  const approved  = planEvents.filter((e) => e.eventType.includes("approved")).length;

  const influence = generated > 1 ? 0.7 : 0.5;
  return [{
    factorCategory: "planning_strategy",
    factorDescription: generated > 1
      ? `${generated} plans were generated — multiple attempts suggest planning difficulty`
      : `Planning proceeded smoothly (${generated} plan(s) generated, ${approved} approved)`,
    influenceScore: influence,
    direction: generated > 1 ? "negative" : "positive",
    evidence: planEvents.slice(0, 3).map((e) => ({ eventId: e.id, eventType: e.eventType })),
  }];
}

function detectExecutionQualityFactors(events: CaseTimelineEvent[]): FactorCandidate[] {
  const execEvents = events.filter((e) => e.eventCategory === "execution");
  if (execEvents.length === 0) return [];

  const failures  = execEvents.filter((e) => e.eventType.includes("failed")).length;
  const retries   = execEvents.filter((e) => e.eventType.includes("retry")).length;
  const completed = execEvents.filter((e) => e.eventType.includes("completed")).length;

  if (failures === 0 && retries === 0) {
    return [{
      factorCategory: "execution_quality",
      factorDescription: `Execution proceeded cleanly (${completed} completion(s), 0 failures)`,
      influenceScore: 0.3,
      direction: "positive",
      evidence: execEvents.slice(0, 3).map((e) => ({ eventId: e.id, eventType: e.eventType })),
    }];
  }

  return [{
    factorCategory: "execution_quality",
    factorDescription: `Execution quality was impacted — ${failures} failure(s), ${retries} retry event(s)`,
    influenceScore: Math.min(1.0, 0.5 + failures * 0.15 + retries * 0.1),
    direction: "negative",
    evidence: execEvents
      .filter((e) => e.eventType.includes("failed") || e.eventType.includes("retry"))
      .slice(0, 3)
      .map((e) => ({ eventId: e.id, eventType: e.eventType })),
  }];
}

function detectTimingFactors(events: CaseTimelineEvent[]): FactorCandidate[] {
  if (events.length < 2) return [];
  const first = events.reduce((a, b) => a.observedAt < b.observedAt ? a : b);
  const last  = events.reduce((a, b) => a.observedAt > b.observedAt ? a : b);
  const durationMs = last.observedAt.getTime() - first.observedAt.getTime();
  const durationHrs = durationMs / 3_600_000;

  if (durationHrs > 24) {
    return [{
      factorCategory: "timing",
      factorDescription: `Case spanned ${durationHrs.toFixed(1)} hours — extended duration may have affected decision freshness`,
      influenceScore: Math.min(1.0, 0.3 + durationHrs / 168),  // 168h = 1 week = max
      direction: "mixed",
      evidence: [{ durationMs, durationHrs }],
    }];
  }
  return [{
    factorCategory: "timing",
    factorDescription: `Case completed in ${(durationMs / 60_000).toFixed(0)} minutes — timely execution`,
    influenceScore: 0.2,
    direction: "positive",
    evidence: [{ durationMs }],
  }];
}

function detectConfidenceFactors(events: CaseTimelineEvent[]): FactorCandidate[] {
  const reasoningEvents = events.filter((e) => e.eventCategory === "reasoning");
  if (reasoningEvents.length === 0) return [];

  return [{
    factorCategory: "confidence",
    factorDescription: `${reasoningEvents.length} reasoning event(s) recorded — executive confidence was exercised`,
    influenceScore: 0.4,
    direction: "positive",
    evidence: reasoningEvents.slice(0, 2).map((e) => ({ eventId: e.id, eventType: e.eventType })),
  }];
}

// ── Master factor detector ─────────────────────────────────────────────────────

export function detectAllFactors(events: CaseTimelineEvent[]): FactorCandidate[] {
  const all = [
    ...detectContextFactors(events),
    ...detectGoalPriorityFactors(events),
    ...detectPlanningStrategyFactors(events),
    ...detectExecutionQualityFactors(events),
    ...detectTimingFactors(events),
    ...detectConfidenceFactors(events),
  ];

  // Sort by influence score descending
  return all.sort((a, b) => b.influenceScore - a.influenceScore);
}

// ── Summary ────────────────────────────────────────────────────────────────────

export function summarizeTopFactors(factors: FactorCandidate[], limit = 5): string[] {
  return factors
    .slice(0, limit)
    .map((f) => `[${f.factorCategory}] ${f.factorDescription} (influence: ${f.influenceScore.toFixed(2)}, ${f.direction})`);
}
