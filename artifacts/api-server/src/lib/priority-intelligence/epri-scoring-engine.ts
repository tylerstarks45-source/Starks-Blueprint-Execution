// ── Build 039: Executive Priority Intelligence Engine — Priority Scoring ──
// Calculates weighted 8-dimension composite priority scores.
// Executive Priority Law: urgency is never the sole driver.
// Fail-open: scoring errors return a safe zero-score item.

import type {
  PriorityItemInput,
  ScoredItem,
  EscalationLevel,
  AgingStatus,
} from "./types";
import { PRIORITY_WEIGHTS } from "./types";
import { computeAgingStatus } from "./epri-aging-engine";

// ── Composite score calculation ───────────────────────────────────────────

function computeComposite(item: PriorityItemInput, depCriticality: number): number {
  return (
    item.strategicValue       * PRIORITY_WEIGHTS.strategicValue +
    item.businessImpact       * PRIORITY_WEIGHTS.businessImpact +
    item.urgency              * PRIORITY_WEIGHTS.urgency +
    depCriticality            * PRIORITY_WEIGHTS.dependencyCriticality +
    item.resourceAvailability * PRIORITY_WEIGHTS.resourceAvailability +
    item.riskReduction        * PRIORITY_WEIGHTS.riskReduction +
    item.confidence           * PRIORITY_WEIGHTS.confidence +
    item.timeSensitivity      * PRIORITY_WEIGHTS.timeSensitivity
  );
}

// ── Escalation classification ─────────────────────────────────────────────

function classifyEscalation(
  composite: number,
  urgency: number,
  businessImpact: number,
  timeSensitivity: number,
): EscalationLevel {
  // Executive: extremely high composite + high urgency + high business risk
  if (composite >= 0.90 && urgency >= 0.85 && businessImpact >= 0.85) return "executive";
  // Critical: very high composite or high urgency+time-sensitivity
  if (composite >= 0.80 || (urgency >= 0.80 && timeSensitivity >= 0.75)) return "critical";
  // High: solid composite or meaningful urgency
  if (composite >= 0.65 || (urgency >= 0.65 && businessImpact >= 0.60)) return "high";
  // Important: moderate composite
  if (composite >= 0.45) return "important";
  return "normal";
}

// ── Aging penalty ─────────────────────────────────────────────────────────

function applyAgingPenalty(composite: number, ageInDays: number): number {
  const aging = computeAgingStatus(ageInDays);
  const penalties: Record<AgingStatus, number> = {
    fresh:            0,
    aging:            0.02,
    neglected:        0.05,
    stale:            0.10,
    critical_neglect: 0.15,
  };
  return Math.max(0, composite - penalties[aging]);
}

// ── Score a batch of items ────────────────────────────────────────────────

export function scoreItems(
  items: PriorityItemInput[],
  dependencyCriticalityMap: Map<string, number>,
): ScoredItem[] {
  if (items.length === 0) return [];

  const scored = items.map((item): Omit<ScoredItem, "rank"> => {
    const depCriticality = dependencyCriticalityMap.get(item.key) ?? 0;
    const rawComposite   = computeComposite(item, depCriticality);
    const composite      = applyAgingPenalty(rawComposite, item.ageInDays);
    const escalation     = classifyEscalation(composite, item.urgency, item.businessImpact, item.timeSensitivity);
    const agingStatus    = computeAgingStatus(item.ageInDays);
    const isBlocked      = item.status === "blocked";

    return {
      itemKey:               item.key,
      itemTitle:             item.title,
      itemType:              item.type,
      strategicValue:        item.strategicValue,
      businessImpact:        item.businessImpact,
      urgency:               item.urgency,
      dependencyCriticality: depCriticality,
      resourceAvailability:  item.resourceAvailability,
      riskReduction:         item.riskReduction,
      confidence:            item.confidence,
      timeSensitivity:       item.timeSensitivity,
      compositeScore:        composite,
      escalationLevel:       escalation,
      agingStatus,
      isBlocked,
      blockedBy:             [],  // populated by dependency engine
      priorityLawApplied:    true,
    };
  });

  // Sort descending by composite; blocked items fall to end
  scored.sort((a, b) => {
    if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1;
    return b.compositeScore - a.compositeScore;
  });

  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
