// ── EPI Capacity Intelligence Engine ─────────────────────────────────────
// Calculates: Current utilization, Available capacity, Growth capacity,
// Constraint pressure, Expansion readiness.
// Pure computation — no I/O.

import type {
  PortfolioInitiativeInput,
  TotalResources,
  ResourceType,
  CapacityResult,
  AllocationResult,
} from "./types";

const RESOURCE_KEYS: ResourceType[] = ["budget", "people", "infrastructure", "compute", "time", "attention"];

export function computePortfolioCapacity(
  initiatives: PortfolioInitiativeInput[],
  totalResources: TotalResources,
  allocations: AllocationResult[],
): CapacityResult {
  const active = initiatives.filter(i => i.status !== "completed");

  // Per-resource breakdown
  const resourceBreakdown = {} as Record<ResourceType, { utilized: number; available: number; overcommitted: boolean }>;
  const overcommittedResources: ResourceType[] = [];

  for (const resource of RESOURCE_KEYS) {
    const alloc = allocations.find(a => a.resourceType === resource);
    const utilized = alloc?.totalAllocated ?? 0;
    const available = totalResources[resource] ?? 0;
    const overcommitted = utilized > available;
    if (overcommitted) overcommittedResources.push(resource);

    resourceBreakdown[resource] = {
      utilized:     Math.round(utilized    * 1000) / 1000,
      available:    Math.round(available   * 1000) / 1000,
      overcommitted,
    };
  }

  // Current utilization: mean utilization rate across all resources
  const utilizationRates = RESOURCE_KEYS.map(r => {
    const available = totalResources[r] ?? 0;
    const utilized  = resourceBreakdown[r]?.utilized ?? 0;
    return available > 0 ? utilized / available : 0;
  });
  const currentUtilization = Math.round(
    utilizationRates.reduce((s, v) => s + v, 0) / utilizationRates.length * 1000
  ) / 1000;

  // Available capacity: mean headroom (1 - utilization), capped at 0
  const availableCapacity = Math.round(
    Math.max(0, 1 - currentUtilization) * 1000
  ) / 1000;

  // Growth capacity: minimum headroom across all resources (bottleneck)
  const headrooms = RESOURCE_KEYS.map(r => {
    const available = totalResources[r] ?? 0;
    const utilized  = resourceBreakdown[r]?.utilized ?? 0;
    return available > 0 ? Math.max(0, (available - utilized) / available) : 0;
  });
  const growthCapacity = Math.round(Math.min(...headrooms) * 1000) / 1000;

  // Constraint pressure: based on most-constrained resource
  const mostConstrainedRate = Math.max(...utilizationRates);
  const mostConstrainedIdx  = utilizationRates.indexOf(mostConstrainedRate);
  const mostConstrainedResource = RESOURCE_KEYS[mostConstrainedIdx] ?? null;
  const constraintPressure = Math.round(Math.min(1.0, mostConstrainedRate) * 1000) / 1000;

  // Expansion readiness: ability to take on new initiatives
  // High headroom + low overcommit + low constraint pressure = ready
  const expansionReadiness = Math.round(
    Math.max(0, growthCapacity * (1 - Math.max(0, constraintPressure - 0.70) * 3)) * 1000
  ) / 1000;

  // Capacity score: 1=healthy utilization (60-85%), 0=overcommitted or empty
  let capacityScore = 1.0;
  if (overcommittedResources.length > 0) {
    capacityScore = Math.max(0.10, 1.0 - overcommittedResources.length * 0.20);
  } else if (currentUtilization < 0.40) {
    capacityScore = 0.70; // underutilised
  } else if (currentUtilization > 0.90) {
    capacityScore = 0.75; // near-capacity warning
  }

  return {
    currentUtilization,
    availableCapacity,
    growthCapacity,
    constraintPressure,
    expansionReadiness,
    mostConstrainedResource,
    resourceBreakdown,
    overcommittedResources,
    capacityScore: Math.round(capacityScore * 1000) / 1000,
  };
}

// Identify portfolio gaps: types/themes with zero or minimal investment
export function identifyPortfolioGaps(initiatives: PortfolioInitiativeInput[]): string[] {
  const gaps: string[] = [];
  const types = new Set(initiatives.map(i => i.type));
  const themes = new Set(initiatives.map(i => i.theme));

  if (!types.has("infrastructure") && initiatives.length > 4)
    gaps.push("No infrastructure initiatives — platform foundations may be neglected");
  if (!themes.has("maintenance") && !themes.has("stability") && initiatives.length > 4)
    gaps.push("No stability/maintenance theme — technical debt may be accumulating");
  if (!types.has("product") && types.has("technology") && initiatives.length > 4)
    gaps.push("Technology investment without product investment — user-facing value gap");

  return gaps;
}

// Identify execution bottlenecks: which resource is blocking forward momentum
export function identifyExecutionBottlenecks(capacity: CapacityResult): string[] {
  const bottlenecks: string[] = [];
  for (const [resource, data] of Object.entries(capacity.resourceBreakdown)) {
    if (data.overcommitted) {
      bottlenecks.push(`${resource} is overcommitted (${(data.utilized / (data.available || 1) * 100).toFixed(0)}% utilized)`);
    } else if (data.utilized / (data.available || 1) > 0.90) {
      bottlenecks.push(`${resource} is near-capacity (${(data.utilized / (data.available || 1) * 100).toFixed(0)}%)`);
    }
  }
  return bottlenecks;
}
