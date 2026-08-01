// ── EPI Allocation Intelligence Engine ───────────────────────────────────
// Evaluates allocation of Budget, People, Infrastructure, Compute, Time,
// and Attention across portfolio initiatives.
// Pure computation — no I/O.

import type {
  PortfolioInitiativeInput,
  ResourceType,
  TotalResources,
  InvestmentBucket,
  AllocationResult,
} from "./types";

const RESOURCE_KEYS: ResourceType[] = ["budget", "people", "infrastructure", "compute", "time", "attention"];

// Compute allocation for a single resource type
function computeResourceAllocation(
  resource: ResourceType,
  initiatives: PortfolioInitiativeInput[],
  totalAvailable: number,
): AllocationResult {
  const activeInitiatives = initiatives.filter(i => i.status !== "completed");
  const totalAllocated = activeInitiatives.reduce((sum, i) => sum + (i.resourceDemand[resource] ?? 0), 0);
  const utilizationRate = totalAvailable > 0 ? totalAllocated / totalAvailable : 0;
  const overcommitted = totalAllocated > totalAvailable;
  const overcommitDelta = Math.max(0, totalAllocated - totalAvailable);

  // Bucket breakdown: how much of total allocation goes to each bucket
  const bucketTotals: Record<InvestmentBucket, number> = { maintain: 0, innovate: 0, grow: 0, infrastructure: 0 };
  for (const init of activeInitiatives) {
    bucketTotals[init.investmentBucket] = (bucketTotals[init.investmentBucket] ?? 0) + (init.resourceDemand[resource] ?? 0);
  }
  const bucketsBreakdown: Record<InvestmentBucket, number> = {
    maintain:       totalAllocated > 0 ? Math.round(bucketTotals.maintain       / totalAllocated * 1000) / 1000 : 0,
    innovate:       totalAllocated > 0 ? Math.round(bucketTotals.innovate       / totalAllocated * 1000) / 1000 : 0,
    grow:           totalAllocated > 0 ? Math.round(bucketTotals.grow           / totalAllocated * 1000) / 1000 : 0,
    infrastructure: totalAllocated > 0 ? Math.round(bucketTotals.infrastructure / totalAllocated * 1000) / 1000 : 0,
  };

  // Top consumers
  const topConsumers = [...activeInitiatives]
    .sort((a, b) => (b.resourceDemand[resource] ?? 0) - (a.resourceDemand[resource] ?? 0))
    .slice(0, 3)
    .map(i => ({ key: i.key, title: i.title, demand: i.resourceDemand[resource] ?? 0 }));

  // Allocation score: 1=optimal (60-85% utilization), penalise overcommit and underutilisation
  let allocationScore = 1.0;
  if (overcommitted) {
    allocationScore = Math.max(0, 1.0 - overcommitDelta * 2);
  } else if (utilizationRate < 0.40) {
    allocationScore = 0.60; // underutilised
  } else if (utilizationRate > 0.90) {
    allocationScore = 0.80; // near-capacity warning
  }

  return {
    resourceType:     resource,
    totalAvailable:   Math.round(totalAvailable * 1000) / 1000,
    totalAllocated:   Math.round(totalAllocated * 1000) / 1000,
    utilizationRate:  Math.round(utilizationRate * 1000) / 1000,
    overcommitted,
    overcommitDelta:  Math.round(overcommitDelta * 1000) / 1000,
    bucketsBreakdown,
    topConsumers,
    allocationScore:  Math.round(allocationScore * 1000) / 1000,
  };
}

// Compute allocation across all 6 resource types
export function computeAllAllocations(
  initiatives: PortfolioInitiativeInput[],
  totalResources: TotalResources,
): AllocationResult[] {
  return RESOURCE_KEYS.map(resource =>
    computeResourceAllocation(resource, initiatives, totalResources[resource])
  );
}

// Check if portfolio is overcommitted on any resource
export function isPortfolioOvercommitted(allocations: AllocationResult[]): boolean {
  return allocations.some(a => a.overcommitted);
}

// Get overcommitted resources list
export function getOvercommittedResources(allocations: AllocationResult[]): ResourceType[] {
  return allocations.filter(a => a.overcommitted).map(a => a.resourceType);
}

// Composite allocation health score (mean of all resource allocation scores)
export function computeAllocationHealthScore(allocations: AllocationResult[]): number {
  if (allocations.length === 0) return 1.0;
  return Math.round(
    allocations.reduce((s, a) => s + a.allocationScore, 0) / allocations.length * 1000
  ) / 1000;
}
