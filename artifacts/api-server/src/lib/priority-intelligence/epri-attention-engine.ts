// ── Build 039: Executive Priority Intelligence Engine — Attention Allocation ─
// Determines where executive attention should be concentrated.
// Measures: Attention Load, Priority Saturation, Focus Drift, Critical Window Utilization.
// Pure — no DB access, no side effects.

import type { ScoredItem, AttentionResult, EscalationRecord } from "./types";

// ── Attention load ─────────────────────────────────────────────────────────
// Sum of composite scores for top-N items. If load > capacity, warn.

const EXECUTIVE_ATTENTION_CAPACITY = 10; // max items an executive can meaningfully track

function computeAttentionLoad(items: ScoredItem[]): number {
  if (items.length === 0) return 0;
  const activeHighPriority = items.filter(s => !s.isBlocked && s.compositeScore >= 0.50);
  return Math.min(1, activeHighPriority.length / EXECUTIVE_ATTENTION_CAPACITY);
}

// ── Priority saturation ────────────────────────────────────────────────────
// Fraction of items with escalation level ≥ "high"

function computePrioritySaturation(items: ScoredItem[]): number {
  if (items.length === 0) return 0;
  const high = items.filter(s =>
    s.escalationLevel === "high" ||
    s.escalationLevel === "critical" ||
    s.escalationLevel === "executive",
  );
  return high.length / items.length;
}

// ── Focus drift ────────────────────────────────────────────────────────────
// How spread out are the composite scores? High variance → high drift.
// Measured as coefficient of variation of top-10 active items.

function computeFocusDrift(items: ScoredItem[]): number {
  const top = items.filter(s => !s.isBlocked).slice(0, 10);
  if (top.length < 2) return 0;
  const scores = top.map(s => s.compositeScore);
  const mean   = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (mean === 0) return 0;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.min(1, cv); // cap at 1
}

// ── Critical window utilization ─────────────────────────────────────────────
// Are the "executive" and "critical" items actually being actioned?
// Proxy: fraction of critical/executive items that are NOT blocked.

function computeCriticalWindowUtilization(items: ScoredItem[]): number {
  const critical = items.filter(s =>
    s.escalationLevel === "critical" || s.escalationLevel === "executive",
  );
  if (critical.length === 0) return 1; // nothing critical = window is fully available
  const unblocked = critical.filter(s => !s.isBlocked);
  return unblocked.length / critical.length;
}

// ── Attention score ────────────────────────────────────────────────────────
// Higher = healthier attention allocation. Penalise overload, saturation, drift.

function computeAttentionScore(
  load:     number,
  sat:      number,
  drift:    number,
  winUtil:  number,
): number {
  // Load penalty: ideal is 0.60-0.80 utilization
  const loadPenalty = load < 0.40 ? 0.10 :
                      load > 0.90 ? 0.30 : 0;

  // Saturation penalty
  const satPenalty = sat > 0.70 ? 0.20 :
                     sat > 0.50 ? 0.10 : 0;

  // Drift penalty
  const driftPenalty = drift > 0.70 ? 0.20 :
                       drift > 0.40 ? 0.10 : 0;

  // Window bonus
  const windowBonus = winUtil >= 0.80 ? 0.05 : 0;

  return Math.max(0, Math.min(1, 1 - loadPenalty - satPenalty - driftPenalty + windowBonus));
}

// ── Warnings ──────────────────────────────────────────────────────────────

function buildAttentionWarnings(
  load:    number,
  sat:     number,
  drift:   number,
  winUtil: number,
): string[] {
  const warnings: string[] = [];
  if (load > 0.90) warnings.push("Executive attention is overloaded — too many high-priority items competing simultaneously.");
  if (load < 0.30) warnings.push("Executive attention is underutilised — insufficient high-priority work in queue.");
  if (sat > 0.70)  warnings.push("Priority queue is saturated — more than 70% of items are high/critical/executive level.");
  if (drift > 0.70)warnings.push("Focus drift detected — priority scores are highly dispersed; executive focus is fragmented.");
  if (winUtil < 0.50) warnings.push("Critical window underutilised — more than half of critical/executive items are blocked.");
  return warnings;
}

// ── Top attention items ────────────────────────────────────────────────────

function selectTopAttentionItems(items: ScoredItem[], escalations: EscalationRecord[]): string[] {
  const criticalKeys = new Set(
    escalations
      .filter(e => e.escalationLevel === "critical" || e.escalationLevel === "executive")
      .map(e => e.itemKey),
  );

  // Prioritize: unblocked + critical/executive first, then by composite score
  return items
    .filter(s => !s.isBlocked)
    .sort((a, b) => {
      const aIsCrit = criticalKeys.has(a.itemKey);
      const bIsCrit = criticalKeys.has(b.itemKey);
      if (aIsCrit !== bIsCrit) return aIsCrit ? -1 : 1;
      return b.compositeScore - a.compositeScore;
    })
    .slice(0, 5)
    .map(s => s.itemKey);
}

// ── Recommended focus area ─────────────────────────────────────────────────

function recommendFocusArea(items: ScoredItem[]): string | null {
  if (items.length === 0) return null;

  // Count by itemType in the top-5
  const top = items.filter(s => !s.isBlocked).slice(0, 5);
  if (top.length === 0) return null;

  const counts = new Map<string, number>();
  for (const s of top) {
    counts.set(s.itemType, (counts.get(s.itemType) ?? 0) + 1);
  }

  let best = "";
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) { best = type; bestCount = count; }
  }

  return best || null;
}

// ── Main export ────────────────────────────────────────────────────────────

export function analyzeAttention(
  scoredItems:  ScoredItem[],
  escalations:  EscalationRecord[],
): AttentionResult {
  const load    = computeAttentionLoad(scoredItems);
  const sat     = computePrioritySaturation(scoredItems);
  const drift   = computeFocusDrift(scoredItems);
  const winUtil = computeCriticalWindowUtilization(scoredItems);
  const score   = computeAttentionScore(load, sat, drift, winUtil);

  return {
    attentionLoad:             load,
    prioritySaturation:        sat,
    focusDrift:                drift,
    criticalWindowUtilization: winUtil,
    attentionScore:            score,
    topAttentionItems:         selectTopAttentionItems(scoredItems, escalations),
    attentionWarnings:         buildAttentionWarnings(load, sat, drift, winUtil),
    recommendedFocusArea:      recommendFocusArea(scoredItems),
  };
}
