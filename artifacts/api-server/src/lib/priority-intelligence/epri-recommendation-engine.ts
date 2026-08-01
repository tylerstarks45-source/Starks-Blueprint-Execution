// ── Build 039: Executive Priority Intelligence Engine — Recommendation Engine ─
// Produces: execute_now | prepare | monitor | delegate | delay | retire
// Every recommendation includes: evidence, business impact, opportunity cost,
// risk if delayed, confidence, reasoning trace.
// Executive Priority Law: urgency alone NEVER triggers execute_now.
// Fail-open; capped at 8 recommendations.

import type {
  ScoredItem,
  PriorityRecommendationResult,
  PriorityAction,
  PriorityActionPriority,
  EscalationRecord,
  AttentionResult,
} from "./types";

const MAX_RECS = 8;

// ── Determine action ──────────────────────────────────────────────────────

function determineAction(
  item:       ScoredItem,
  escalation: EscalationRecord,
  attention:  AttentionResult,
): PriorityAction {
  // Retire: stale or critical-neglect + low composite
  if (
    (item.agingStatus === "stale" || item.agingStatus === "critical_neglect") &&
    item.compositeScore < 0.35
  ) return "retire";

  // Delay: blocked or very low composite
  if (item.isBlocked || item.compositeScore < 0.25) return "delay";

  // Delegate: reasonable composite but attention is overloaded and not top priority
  if (
    attention.attentionLoad > 0.80 &&
    item.compositeScore >= 0.40 &&
    item.rank > 3 &&
    escalation.escalationLevel !== "critical" &&
    escalation.escalationLevel !== "executive"
  ) return "delegate";

  // Execute now: high composite + unblocked + law-compliant (not urgency-only)
  if (
    item.compositeScore >= 0.72 &&
    !item.isBlocked &&
    (escalation.escalationLevel === "critical" || escalation.escalationLevel === "executive") &&
    item.strategicValue >= 0.55 &&  // Priority Law: must have strategic value
    item.businessImpact >= 0.55     // Priority Law: must have business impact
  ) return "execute_now";

  // Prepare: high composite, not yet critical
  if (item.compositeScore >= 0.55 && escalation.escalationLevel === "high") return "prepare";

  // Monitor: moderate composite
  if (item.compositeScore >= 0.35) return "monitor";

  return "delay";
}

// ── Determine priority ────────────────────────────────────────────────────

function determinePriority(
  action:     PriorityAction,
  escalation: EscalationRecord,
): PriorityActionPriority {
  if (action === "execute_now") {
    if (escalation.escalationLevel === "executive") return "critical";
    return "high";
  }
  if (action === "prepare") return "high";
  if (action === "monitor") return "medium";
  return "low";
}

// ── Build evidence ────────────────────────────────────────────────────────

function buildEvidence(
  item:       ScoredItem,
  escalation: EscalationRecord,
): { point: string; source: string }[] {
  const evidence = [
    { point: `Composite priority score: ${(item.compositeScore * 100).toFixed(0)}%`, source: "priority_scoring_engine" },
    { point: `Strategic value: ${(item.strategicValue * 100).toFixed(0)}%`, source: "scoring_dimension" },
    { point: `Business impact: ${(item.businessImpact * 100).toFixed(0)}%`, source: "scoring_dimension" },
    { point: `Escalation level: ${escalation.escalationLevel}`, source: "escalation_engine" },
  ];
  if (item.isBlocked)
    evidence.push({ point: `Blocked by: ${item.blockedBy.join(", ")}`, source: "dependency_engine" });
  if (item.agingStatus !== "fresh")
    evidence.push({ point: `Aging status: ${item.agingStatus}`, source: "aging_engine" });
  return evidence;
}

// ── Build recommendation ──────────────────────────────────────────────────

function buildRecommendation(
  item:       ScoredItem,
  escalation: EscalationRecord,
  attention:  AttentionResult,
): PriorityRecommendationResult {
  const action   = determineAction(item, escalation, attention);
  const priority = determinePriority(action, escalation);
  const evidence = buildEvidence(item, escalation);

  const businessImpactTexts: Record<PriorityAction, string> = {
    execute_now: `Completing "${item.itemTitle}" unlocks downstream value (strategic: ${(item.strategicValue*100).toFixed(0)}%, business: ${(item.businessImpact*100).toFixed(0)}%).`,
    prepare:     `Preparing "${item.itemTitle}" positions the organisation to capture value when conditions are right.`,
    monitor:     `"${item.itemTitle}" is progressing within acceptable parameters — monitor for changes.`,
    delegate:    `Delegating "${item.itemTitle}" frees executive attention for higher-priority items.`,
    delay:       `"${item.itemTitle}" is blocked or low-priority — delaying reduces wasted effort.`,
    retire:      `"${item.itemTitle}" is stale or low-value — retiring it reduces noise in the priority queue.`,
  };

  const opportunityCostTexts: Record<PriorityAction, string> = {
    execute_now: "Delaying this item risks losing its strategic window.",
    prepare:     "Failure to prepare may reduce readiness when the execution window opens.",
    monitor:     "Low opportunity cost — item is not on a time-critical path.",
    delegate:    "Minimal opportunity cost — value is preserved through delegation.",
    delay:       item.isBlocked ? "Unblocking dependencies is required before opportunity cost is relevant." : "Low immediate cost, but aging penalty will increase over time.",
    retire:      "Sunk cost risk is low; retiring preserves attention capacity.",
  };

  const riskIfDelayedTexts: Record<PriorityAction, string> = {
    execute_now: `Risk increases by ~${(item.timeSensitivity * 100).toFixed(0)}% per cycle if delayed. Aging penalty will apply.`,
    prepare:     "Insufficient preparation may lead to poor execution quality.",
    monitor:     "Escalation risk is present if conditions change unexpectedly.",
    delegate:    "Delegation risk: ensure owner has capacity and context.",
    delay:       "Continued delay accelerates aging status.",
    retire:      "No significant risk if retired — item is already stale.",
  };

  const reasoningTrace = [
    `Rank: ${item.rank} of N. Composite: ${(item.compositeScore*100).toFixed(0)}%.`,
    `Strategic: ${(item.strategicValue*100).toFixed(0)}%, Business: ${(item.businessImpact*100).toFixed(0)}%, Urgency: ${(item.urgency*100).toFixed(0)}%.`,
    `Escalation: ${escalation.escalationLevel}. Aging: ${item.agingStatus}. Blocked: ${item.isBlocked}.`,
    `Executive Priority Law applied: urgency (${(item.urgency*100).toFixed(0)}%) did not override strategic/business balance.`,
    `Action: ${action}. Priority: ${priority}.`,
  ].join(" ");

  return {
    itemKey:            item.itemKey,
    itemTitle:          item.itemTitle,
    action,
    priority,
    evidence,
    businessImpact:     businessImpactTexts[action],
    opportunityCost:    opportunityCostTexts[action],
    riskIfDelayed:      riskIfDelayedTexts[action],
    confidenceScore:    item.confidence * 0.5 + item.compositeScore * 0.5,
    reasoningTrace,
    priorityLawApplied: true,
  };
}

// ── Recommend for all items ────────────────────────────────────────────────

export function buildPriorityRecommendations(
  scoredItems:  ScoredItem[],
  escalations:  EscalationRecord[],
  attention:    AttentionResult,
): PriorityRecommendationResult[] {
  if (scoredItems.length === 0) return [];

  const escalationMap = new Map(escalations.map(e => [e.itemKey, e]));

  // Only recommend for non-completed items
  const active = scoredItems.filter(s =>
    s.itemType !== "execution" || !s.itemTitle.toLowerCase().includes("completed"),
  );

  const recs = active
    .slice(0, 20) // consider top 20 by rank
    .map(item => buildRecommendation(
      item,
      escalationMap.get(item.itemKey) ?? {
        itemKey:           item.itemKey,
        itemTitle:         item.itemTitle,
        escalationLevel:   item.escalationLevel,
        reason:            "Derived from scoring engine.",
        triggerDimensions: [],
        compositeScore:    item.compositeScore,
        urgencyScore:      item.urgency,
        businessRisk:      0,
      },
      attention,
    ));

  // Sort: critical → high → medium → low, then by confidence
  const priorityOrder: PriorityActionPriority[] = ["critical", "high", "medium", "low"];
  recs.sort((a, b) => {
    const ap = priorityOrder.indexOf(a.priority);
    const bp = priorityOrder.indexOf(b.priority);
    if (ap !== bp) return ap - bp;
    return b.confidenceScore - a.confidenceScore;
  });

  return recs.slice(0, MAX_RECS);
}
