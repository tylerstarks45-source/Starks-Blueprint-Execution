// ── EPI Portfolio Construction Engine ────────────────────────────────────
// Creates structured portfolios from initiative inputs.
// Classifies initiatives, identifies critical path, marks dependency clusters.
// Pure computation — no I/O.

import type {
  PortfolioInitiativeInput,
  InvestmentBucket,
  StrategicTheme,
  Horizon,
  InitiativeType,
} from "./types";

export interface ConstructedInitiative extends PortfolioInitiativeInput {
  isCriticalPath:   boolean;
  isOnParetoCut:    boolean;  // candidate for portfolio trim if over-capacity
  dependencyCount:  number;
  dependents:       string[]; // initiatives that depend on this one
}

// Build a forward-dependency map (who depends on whom)
export function buildDependencyMap(initiatives: PortfolioInitiativeInput[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const init of initiatives) {
    for (const dep of (init.dependencies ?? [])) {
      const existing = map.get(dep) ?? [];
      existing.push(init.key);
      map.set(dep, existing);
    }
  }
  return map;
}

// Identify critical path: initiatives that other initiatives depend on (blockers)
export function identifyCriticalPath(
  initiatives: PortfolioInitiativeInput[],
  dependents: Map<string, string[]>,
): Set<string> {
  const critical = new Set<string>();
  for (const init of initiatives) {
    const deps = dependents.get(init.key) ?? [];
    if (deps.length >= 2) critical.add(init.key);  // 2+ dependents = critical
    if (init.status === "active" && deps.length >= 1 && init.riskLevel === "high") {
      critical.add(init.key);  // high-risk active blocker
    }
  }
  return critical;
}

// Mark Pareto-cut candidates: planned/on-hold initiatives with low alignment + low unique value
export function markParetoCuts(
  initiatives: PortfolioInitiativeInput[],
  overcommitted: boolean,
): Set<string> {
  const cuts = new Set<string>();
  if (!overcommitted) return cuts;

  // Sort by strategic alignment ascending — lowest alignment candidates first
  const sorted = [...initiatives]
    .filter(i => i.status !== "active" && i.status !== "completed")
    .sort((a, b) => a.strategicAlignment - b.strategicAlignment);

  // Mark bottom 20% as Pareto-cut candidates when overcommitted
  const cutCount = Math.max(0, Math.floor(sorted.length * 0.20));
  for (const init of sorted.slice(0, cutCount)) {
    cuts.add(init.key);
  }
  return cuts;
}

// Classify initiatives into their structured form
export function constructPortfolio(
  initiatives: PortfolioInitiativeInput[],
  isOvercommitted: boolean,
): ConstructedInitiative[] {
  const dependents = buildDependencyMap(initiatives);
  const criticalPath = identifyCriticalPath(initiatives, dependents);
  const paretoCuts = markParetoCuts(initiatives, isOvercommitted);

  return initiatives.map(init => ({
    ...init,
    isCriticalPath:  criticalPath.has(init.key),
    isOnParetoCut:   paretoCuts.has(init.key),
    dependencyCount: (init.dependencies ?? []).length,
    dependents:      dependents.get(init.key) ?? [],
  }));
}

// Compute bucket ratios
export function computeBucketRatios(initiatives: PortfolioInitiativeInput[]): Record<InvestmentBucket, number> {
  const total = initiatives.length || 1;
  const counts: Record<InvestmentBucket, number> = { maintain: 0, innovate: 0, grow: 0, infrastructure: 0 };
  for (const i of initiatives) counts[i.investmentBucket] = (counts[i.investmentBucket] ?? 0) + 1;
  return {
    maintain:       Math.round(counts.maintain / total * 1000) / 1000,
    innovate:       Math.round(counts.innovate / total * 1000) / 1000,
    grow:           Math.round(counts.grow / total * 1000) / 1000,
    infrastructure: Math.round(counts.infrastructure / total * 1000) / 1000,
  };
}

// Compute horizon ratios
export function computeHorizonRatios(initiatives: PortfolioInitiativeInput[]): Record<Horizon, number> {
  const total = initiatives.length || 1;
  const counts: Record<Horizon, number> = { short: 0, medium: 0, long: 0 };
  for (const i of initiatives) counts[i.horizon] = (counts[i.horizon] ?? 0) + 1;
  return {
    short:  Math.round(counts.short  / total * 1000) / 1000,
    medium: Math.round(counts.medium / total * 1000) / 1000,
    long:   Math.round(counts.long   / total * 1000) / 1000,
  };
}

// Compute theme ratios
export function computeThemeRatios(initiatives: PortfolioInitiativeInput[]): Partial<Record<StrategicTheme, number>> {
  const total = initiatives.length || 1;
  const counts: Partial<Record<StrategicTheme, number>> = {};
  for (const i of initiatives) counts[i.theme] = (counts[i.theme] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, Math.round((v as number) / total * 1000) / 1000])
  ) as Partial<Record<StrategicTheme, number>>;
}

// Compute type ratios (for technology/business/execution balance)
export function computeTypeRatios(initiatives: PortfolioInitiativeInput[]): Partial<Record<InitiativeType, number>> {
  const total = initiatives.length || 1;
  const counts: Partial<Record<InitiativeType, number>> = {};
  for (const i of initiatives) counts[i.type] = (counts[i.type] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, Math.round((v as number) / total * 1000) / 1000])
  ) as Partial<Record<InitiativeType, number>>;
}
