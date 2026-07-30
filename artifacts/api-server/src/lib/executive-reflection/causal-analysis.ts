// ─── Causal Analysis Engine (Build 012) ──────────────────────────────────────
//
// Identifies causal links between events in a completed Executive Case.
// Produces causal links ONLY. No recommendations. No inference.
// Uses recorded observation correlations and execution history only.
//
// Pure computation — all DB reads go through reflection-registry.ts.

import type {
  CaseTimelineEvent,
  CausalLink,
  CausalAnalysis,
} from "./types";

// ── Causal link types ─────────────────────────────────────────────────────────

type CausalLinkType = "direct" | "indirect" | "enabling" | "inhibiting";

// ── Pattern-based causal detection ────────────────────────────────────────────

/**
 * Detect causal links from a chronological sequence of timeline events.
 * Rules are deterministic pattern matches on event sequences.
 * No inference beyond what is directly recorded.
 */
export function detectCausalLinks(events: CaseTimelineEvent[]): CausalLink[] {
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const links: CausalLink[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cause = sorted[i]!;

    // ── Pattern 1: goal_created → plan_generated (enabling) ──────────────
    if (
      cause.eventCategory === "goal" &&
      cause.eventType.includes("created")
    ) {
      const planEvent = sorted.slice(i + 1).find(
        (e) => e.eventCategory === "planning" && e.eventType.includes("generated"),
      );
      if (planEvent) {
        links.push({
          causeEventId: cause.id,
          causeDescription: `Goal created: ${cause.eventDescription ?? cause.eventType}`,
          effectEventId: planEvent.id,
          effectDescription: `Plan generated: ${planEvent.eventDescription ?? planEvent.eventType}`,
          linkType: "enabling",
          strength: 0.9,
        });
      }
    }

    // ── Pattern 2: plan_generated → execution_started (enabling) ─────────
    if (
      cause.eventCategory === "planning" &&
      (cause.eventType.includes("generated") || cause.eventType.includes("approved"))
    ) {
      const execEvent = sorted.slice(i + 1).find(
        (e) =>
          e.eventCategory === "execution" &&
          (e.eventType.includes("started") || e.eventType.includes("approved")),
      );
      if (execEvent) {
        links.push({
          causeEventId: cause.id,
          causeDescription: `Plan ready: ${cause.eventDescription ?? cause.eventType}`,
          effectEventId: execEvent.id,
          effectDescription: `Execution began: ${execEvent.eventDescription ?? execEvent.eventType}`,
          linkType: "enabling",
          strength: 0.85,
        });
      }
    }

    // ── Pattern 3: retry/failure observation → execution_failed (direct) ──
    if (
      cause.eventCategory === "observation" &&
      (cause.eventType.includes("failed") || cause.eventType.includes("retry"))
    ) {
      const failEvent = sorted.slice(i + 1, i + 5).find(
        (e) =>
          e.eventCategory === "execution" &&
          e.eventType.includes("failed"),
      );
      if (failEvent) {
        links.push({
          causeEventId: cause.id,
          causeDescription: `Failure signal: ${cause.eventDescription ?? cause.eventType}`,
          effectEventId: failEvent.id,
          effectDescription: `Execution failed: ${failEvent.eventDescription ?? failEvent.eventType}`,
          linkType: "direct",
          strength: 0.8,
        });
      }
    }

    // ── Pattern 4: judgment_evaluated → plan_generated (enabling) ─────────
    if (
      cause.eventCategory === "judgment" &&
      cause.eventType.includes("evaluated")
    ) {
      const planEvent = sorted.slice(i + 1, i + 10).find(
        (e) => e.eventCategory === "planning",
      );
      if (planEvent) {
        links.push({
          causeEventId: cause.id,
          causeDescription: `Judgment evaluated: ${cause.eventDescription ?? cause.eventType}`,
          effectEventId: planEvent.id,
          effectDescription: `Plan activity: ${planEvent.eventDescription ?? planEvent.eventType}`,
          linkType: "enabling",
          strength: 0.7,
        });
      }
    }

    // ── Pattern 5: context_shift → goal_changed (indirect) ───────────────
    if (
      cause.eventCategory === "context" &&
      (cause.eventType.includes("shift") || cause.eventType.includes("updated"))
    ) {
      const goalChange = sorted.slice(i + 1, i + 15).find(
        (e) =>
          e.eventCategory === "goal" &&
          (e.eventType.includes("updated") || e.eventType.includes("changed")),
      );
      if (goalChange) {
        links.push({
          causeEventId: cause.id,
          causeDescription: `Context shifted: ${cause.eventDescription ?? cause.eventType}`,
          effectEventId: goalChange.id,
          effectDescription: `Goal changed: ${goalChange.eventDescription ?? goalChange.eventType}`,
          linkType: "indirect",
          strength: 0.6,
        });
      }
    }

    // ── Pattern 6: multiple retries → stalled progress (direct) ──────────
    if (
      cause.eventCategory === "observation" &&
      cause.eventType.includes("retry")
    ) {
      const retryCount = sorted
        .slice(0, i + 1)
        .filter(
          (e) =>
            e.eventCategory === "observation" &&
            e.eventType.includes("retry") &&
            e.sourceObjectId === cause.sourceObjectId,
        ).length;

      if (retryCount >= 3) {
        links.push({
          causeEventId: cause.id,
          causeDescription: `Repeated retries (${retryCount}) on ${cause.sourceObjectType}:${cause.sourceObjectId?.slice(0, 8)}`,
          effectEventId: null,
          effectDescription: "Execution stalled / risk of failure",
          linkType: "direct",
          strength: Math.min(1.0, 0.5 + retryCount * 0.1),
        });
      }
    }
  }

  // ── De-duplicate (keep highest strength per cause–effect pair) ────────────
  const deduped = new Map<string, CausalLink>();
  for (const link of links) {
    const key = `${link.causeEventId}:${link.effectEventId ?? "null"}`;
    const existing = deduped.get(key);
    if (!existing || link.strength > existing.strength) {
      deduped.set(key, link);
    }
  }

  return [...deduped.values()].sort((a, b) => b.strength - a.strength);
}

// ── Causal analysis assembly ───────────────────────────────────────────────────

export function assembleCausalAnalysis(
  caseId: string,
  links: CausalLink[],
): CausalAnalysis {
  const primaryCauses = links
    .filter((l) => l.linkType === "direct" && l.strength >= 0.7)
    .map((l) => l.causeDescription)
    .slice(0, 5);

  const primaryEffects = links
    .filter((l) => l.effectDescription && l.strength >= 0.7)
    .map((l) => l.effectDescription)
    .slice(0, 5);

  return { caseId, links, primaryCauses, primaryEffects };
}

// ── Influential event identification ──────────────────────────────────────────

/**
 * Return the subset of timeline events that appear as causes in causal links
 * with strength ≥ 0.6, ordered by descending strength.
 */
export function identifyInfluentialEvents(
  events: CaseTimelineEvent[],
  links: CausalLink[],
): CaseTimelineEvent[] {
  const causeIds = new Set(
    links.filter((l) => l.strength >= 0.6).map((l) => l.causeEventId),
  );
  return events
    .filter((e) => causeIds.has(e.id))
    .sort((a, b) => {
      const aMax = Math.max(...links.filter((l) => l.causeEventId === a.id).map((l) => l.strength));
      const bMax = Math.max(...links.filter((l) => l.causeEventId === b.id).map((l) => l.strength));
      return bMax - aMax;
    });
}
