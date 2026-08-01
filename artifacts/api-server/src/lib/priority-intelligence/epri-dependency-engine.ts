// ── Build 039: Executive Priority Intelligence Engine — Dependency Priority ─
// Adjusts priorities based on upstream/downstream dependency relationships.
// Detects: critical paths, blocked items, dependency delay risk, orphans.
// Pure — no DB access, no side effects.

import type { PriorityItemInput, DependencyAnalysis, ScoredItem } from "./types";

// ── Build dependency graph ────────────────────────────────────────────────

interface DepGraph {
  upstream:   Map<string, Set<string>>; // key → items it depends on
  downstream: Map<string, Set<string>>; // key → items that depend on it
}

function buildGraph(items: PriorityItemInput[]): DepGraph {
  const upstream   = new Map<string, Set<string>>();
  const downstream = new Map<string, Set<string>>();
  const itemKeys   = new Set(items.map(i => i.key));

  for (const item of items) {
    if (!upstream.has(item.key))   upstream.set(item.key, new Set());
    if (!downstream.has(item.key)) downstream.set(item.key, new Set());

    for (const dep of (item.dependencies ?? [])) {
      if (!itemKeys.has(dep)) continue; // only track intra-set dependencies
      upstream.get(item.key)!.add(dep);
      if (!downstream.has(dep)) downstream.set(dep, new Set());
      downstream.get(dep)!.add(item.key);
    }
  }

  return { upstream, downstream };
}

// ── Dependency criticality ─────────────────────────────────────────────────
// How critical is an item as a dependency for others?
// Score = (# downstream dependents / total items) × avg downstream composite score

export function buildDependencyCriticalityMap(
  items: PriorityItemInput[],
): Map<string, number> {
  const { downstream } = buildGraph(items);
  const n = items.length;
  const compositeApprox = new Map<string, number>(items.map(i => [
    i.key,
    (i.strategicValue + i.businessImpact + i.urgency) / 3,
  ]));

  const map = new Map<string, number>();
  for (const item of items) {
    const deps = downstream.get(item.key) ?? new Set();
    if (deps.size === 0) {
      map.set(item.key, 0);
      continue;
    }
    const breadth  = Math.min(1, deps.size / Math.max(1, n - 1));
    const avgValue = [...deps].reduce((s, k) => s + (compositeApprox.get(k) ?? 0), 0) / deps.size;
    map.set(item.key, breadth * 0.6 + avgValue * 0.4);
  }
  return map;
}

// ── Dependency analysis ────────────────────────────────────────────────────

export function analyzeDependencies(
  items: PriorityItemInput[],
  scoredItems: ScoredItem[],
): DependencyAnalysis[] {
  const { upstream, downstream } = buildGraph(items);
  const scoreMap = new Map(scoredItems.map(s => [s.itemKey, s.compositeScore]));
  const results: DependencyAnalysis[] = [];

  for (const item of items) {
    for (const depKey of (upstream.get(item.key) ?? [])) {
      const downstreamCount = downstream.get(depKey)?.size ?? 0;
      const isCriticalPath  = downstreamCount >= 2;

      // Delay risk: how likely is a delay in the upstream to cascade?
      const upstreamScore   = scoreMap.get(depKey) ?? 0;
      const downstreamScore = scoreMap.get(item.key) ?? 0;
      const delayRisk       = (downstreamScore * 0.5 + (1 - upstreamScore) * 0.5);

      results.push({
        upstreamKey:    depKey,
        downstreamKey:  item.key,
        dependencyType: "blocks",
        delayRisk:      Math.min(1, delayRisk),
        isCriticalPath,
        notes:          isCriticalPath
          ? `"${depKey}" is on the critical path — ${downstreamCount} item(s) depend on it.`
          : `"${item.key}" depends on "${depKey}".`,
      });
    }
  }

  return results;
}

// ── Populate blockedBy ─────────────────────────────────────────────────────
// Mark ScoredItems as blocked if any upstream item has status=blocked or on_hold

export function populateBlockedBy(
  scoredItems: ScoredItem[],
  items: PriorityItemInput[],
): ScoredItem[] {
  const statusMap    = new Map(items.map(i => [i.key, i.status ?? "active"]));
  const { upstream } = buildGraph(items);

  return scoredItems.map(s => {
    const blockedBy: string[] = [];
    for (const upKey of (upstream.get(s.itemKey) ?? [])) {
      const st = statusMap.get(upKey);
      if (st === "blocked" || st === "on_hold") blockedBy.push(upKey);
    }
    return {
      ...s,
      isBlocked: s.isBlocked || blockedBy.length > 0,
      blockedBy,
    };
  });
}
