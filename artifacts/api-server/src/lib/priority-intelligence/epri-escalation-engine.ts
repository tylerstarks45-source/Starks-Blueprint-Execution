// ── Build 039: Executive Priority Intelligence Engine — Escalation Intelligence ─
// Classifies items as: normal | important | high | critical | executive.
// Classification ONLY — never executes, never changes state.
// Fail-open: classification errors return "normal".

import type { ScoredItem, EscalationRecord, EscalationLevel } from "./types";

// ── Dimension triggers per level ───────────────────────────────────────────

interface EscalationThreshold {
  level:              EscalationLevel;
  compositeMin:       number;
  urgencyMin:         number;
  businessImpactMin:  number;
  timeSensMin:        number;
  reason:             string;
}

const ESCALATION_THRESHOLDS: EscalationThreshold[] = [
  // Most specific first
  {
    level:             "executive",
    compositeMin:      0.88,
    urgencyMin:        0.80,
    businessImpactMin: 0.80,
    timeSensMin:       0.70,
    reason:            "Composite score ≥88% with high urgency, business impact, and time sensitivity.",
  },
  {
    level:             "critical",
    compositeMin:      0.76,
    urgencyMin:        0.70,
    businessImpactMin: 0.65,
    timeSensMin:       0.60,
    reason:            "Critical composite score — immediate attention required to prevent escalation or loss.",
  },
  {
    level:             "high",
    compositeMin:      0.60,
    urgencyMin:        0.50,
    businessImpactMin: 0.50,
    timeSensMin:       0.40,
    reason:            "High composite score — must appear in executive priority queue this cycle.",
  },
  {
    level:             "important",
    compositeMin:      0.40,
    urgencyMin:        0.30,
    businessImpactMin: 0.30,
    timeSensMin:       0.20,
    reason:            "Moderate composite score — monitor and prepare for elevation.",
  },
];

// ── Classify a single scored item ──────────────────────────────────────────

function classifyItem(item: ScoredItem): EscalationRecord {
  // Find the highest matching threshold
  for (const threshold of ESCALATION_THRESHOLDS) {
    if (
      item.compositeScore  >= threshold.compositeMin &&
      item.urgency         >= threshold.urgencyMin &&
      item.businessImpact  >= threshold.businessImpactMin &&
      item.timeSensitivity >= threshold.timeSensMin
    ) {
      const triggerDimensions = buildTriggerDimensions(item, threshold);
      return {
        itemKey:           item.itemKey,
        itemTitle:         item.itemTitle,
        escalationLevel:   threshold.level,
        reason:            threshold.reason,
        triggerDimensions,
        compositeScore:    item.compositeScore,
        urgencyScore:      item.urgency,
        businessRisk:      1 - item.riskReduction, // higher risk if risk reduction is low
      };
    }
  }

  return {
    itemKey:           item.itemKey,
    itemTitle:         item.itemTitle,
    escalationLevel:   "normal",
    reason:            "Composite score below threshold — routine priority.",
    triggerDimensions: [],
    compositeScore:    item.compositeScore,
    urgencyScore:      item.urgency,
    businessRisk:      1 - item.riskReduction,
  };
}

function buildTriggerDimensions(
  item:      ScoredItem,
  threshold: EscalationThreshold,
): string[] {
  const dims: string[] = [];
  if (item.compositeScore  >= threshold.compositeMin)  dims.push("composite_score");
  if (item.urgency         >= threshold.urgencyMin)    dims.push("urgency");
  if (item.businessImpact  >= threshold.businessImpactMin) dims.push("business_impact");
  if (item.timeSensitivity >= threshold.timeSensMin)   dims.push("time_sensitivity");
  if (item.isBlocked)                                  dims.push("blocked_status");
  return dims;
}

// ── Classify all items ────────────────────────────────────────────────────

export function classifyEscalations(scoredItems: ScoredItem[]): EscalationRecord[] {
  try {
    return scoredItems.map(classifyItem);
  } catch {
    return [];
  }
}

// ── Count critical escalations ────────────────────────────────────────────

export function countCriticalEscalations(escalations: EscalationRecord[]): number {
  return escalations.filter(
    e => e.escalationLevel === "critical" || e.escalationLevel === "executive",
  ).length;
}
