// ── Build 039: Executive Priority Intelligence Engine — Priority Aging ────
// Detects neglected work, recurring postponement, priority decay,
// missed opportunities, and stale recommendations.
// Pure function — no side effects.

import type { AgingStatus, PriorityItemInput } from "./types";

// ── Age thresholds ────────────────────────────────────────────────────────

const AGING_THRESHOLDS = {
  fresh:            7,    // ≤ 7 days
  aging:            30,   // 8–30 days
  neglected:        90,   // 31–90 days
  stale:            180,  // 91–180 days
  critical_neglect: Infinity, // >180 days
} as const;

export function computeAgingStatus(ageInDays: number): AgingStatus {
  if (ageInDays <= AGING_THRESHOLDS.fresh)     return "fresh";
  if (ageInDays <= AGING_THRESHOLDS.aging)     return "aging";
  if (ageInDays <= AGING_THRESHOLDS.neglected) return "neglected";
  if (ageInDays <= AGING_THRESHOLDS.stale)     return "stale";
  return "critical_neglect";
}

// ── Aging analysis ────────────────────────────────────────────────────────

export interface AgingResult {
  itemKey:           string;
  itemTitle:         string;
  ageInDays:         number;
  agingStatus:       AgingStatus;
  penaltyApplied:    number;
  warningMessage:    string;
}

export function analyzeAging(items: PriorityItemInput[]): AgingResult[] {
  return items.map(item => {
    const agingStatus = computeAgingStatus(item.ageInDays);

    const penalties: Record<AgingStatus, number> = {
      fresh:            0,
      aging:            0.02,
      neglected:        0.05,
      stale:            0.10,
      critical_neglect: 0.15,
    };

    const warnings: Record<AgingStatus, string> = {
      fresh:            "",
      aging:            `"${item.title}" has been open for ${item.ageInDays} days — monitor for neglect.`,
      neglected:        `"${item.title}" is neglected (${item.ageInDays} days). Priority penalty applied.`,
      stale:            `"${item.title}" is stale (${item.ageInDays} days). Review urgency and retire if no longer valid.`,
      critical_neglect: `"${item.title}" is critically neglected (${item.ageInDays} days). Executive attention required.`,
    };

    return {
      itemKey:        item.key,
      itemTitle:      item.title,
      ageInDays:      item.ageInDays,
      agingStatus,
      penaltyApplied: penalties[agingStatus],
      warningMessage: warnings[agingStatus],
    };
  }).filter(r => r.agingStatus !== "fresh");
}

// ── Stale items count ─────────────────────────────────────────────────────

export function countStaleItems(items: PriorityItemInput[]): number {
  return items.filter(i => {
    const s = computeAgingStatus(i.ageInDays);
    return s === "stale" || s === "critical_neglect";
  }).length;
}
