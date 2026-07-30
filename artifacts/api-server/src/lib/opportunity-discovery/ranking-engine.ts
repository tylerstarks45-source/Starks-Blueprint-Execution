// ─── Build 017: Opportunity Ranking Engine ────────────────────────────────────
//
// Ranks scored candidates and assigns priority groups.
// Pure function — no DB I/O.

import type { PriorityGroup } from "./types";
import type { ScoredCandidate } from "./scoring-engine";

export interface RankedCandidate extends ScoredCandidate {
  rankPosition: number;
  priorityGroup: PriorityGroup;
}

// ── Priority thresholds ───────────────────────────────────────────────────────

function toPriorityGroup(compositeScore: number): PriorityGroup {
  if (compositeScore >= 0.75) return "critical";
  if (compositeScore >= 0.55) return "high";
  if (compositeScore >= 0.35) return "medium";
  return "low";
}

// ── Rank ──────────────────────────────────────────────────────────────────────

export function rankOpportunities(candidates: ScoredCandidate[]): RankedCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.compositeScore - a.compositeScore);
  return sorted.map((c, i) => ({
    ...c,
    rankPosition: i + 1,
    priorityGroup: toPriorityGroup(c.compositeScore),
  }));
}

// ── Top N ─────────────────────────────────────────────────────────────────────

export function topN(ranked: RankedCandidate[], n: number): RankedCandidate[] {
  return ranked.slice(0, n);
}

// ── Priority groups ───────────────────────────────────────────────────────────

export type PriorityGroupMap = Record<PriorityGroup, RankedCandidate[]>;

export function toPriorityGroups(ranked: RankedCandidate[]): PriorityGroupMap {
  return {
    critical: ranked.filter((r) => r.priorityGroup === "critical"),
    high: ranked.filter((r) => r.priorityGroup === "high"),
    medium: ranked.filter((r) => r.priorityGroup === "medium"),
    low: ranked.filter((r) => r.priorityGroup === "low"),
  };
}

// ── Category distribution ─────────────────────────────────────────────────────

export function categoryDistribution(ranked: RankedCandidate[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const r of ranked) {
    dist[r.category] = (dist[r.category] ?? 0) + 1;
  }
  return dist;
}

export function priorityDistribution(ranked: RankedCandidate[]): Record<string, number> {
  return {
    critical: ranked.filter((r) => r.priorityGroup === "critical").length,
    high: ranked.filter((r) => r.priorityGroup === "high").length,
    medium: ranked.filter((r) => r.priorityGroup === "medium").length,
    low: ranked.filter((r) => r.priorityGroup === "low").length,
  };
}

export function sourceDistribution(ranked: RankedCandidate[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const r of ranked) {
    dist[r.discoverySource] = (dist[r.discoverySource] ?? 0) + 1;
  }
  return dist;
}

export function topCategory(ranked: RankedCandidate[]): string | null {
  const dist = categoryDistribution(ranked);
  const entries = Object.entries(dist);
  if (entries.length === 0) return null;
  return entries.sort(([, a], [, b]) => b - a)[0]![0];
}
