import { db } from "@workspace/db";
import { resourceCapacity } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ResourceObservation, CapacityAssessment } from "./types";

// Heuristic growth: 0.5% per day for most resources (conservative baseline).
// Real growth rates arrive via EP_PII_CAPACITY_ASSESSED.
const DAILY_GROWTH_RATE = 0.5;

export async function assessCapacity(obs: ResourceObservation): Promise<CapacityAssessment> {
  const total = obs.totalCapacity ?? 100;
  const used = obs.usedCapacity ?? (total * obs.utilizationPercent / 100);
  const available = obs.availableCapacity ?? (total - used);
  const growthRatePerDay = DAILY_GROWTH_RATE;

  // Days to exhaustion: at current growth rate, how many days until used >= total?
  const remainingCapacity = available;
  const dailyGrowth = total * (growthRatePerDay / 100);
  const daysToExhaustion = dailyGrowth > 0 && obs.utilizationPercent > 30
    ? Math.floor(remainingCapacity / dailyGrowth)
    : undefined;

  try {
    await db.insert(resourceCapacity).values({
      resourceKey: obs.resourceKey,
      resourceType: obs.resourceType,
      totalCapacity: total,
      usedCapacity: used,
      availableCapacity: available,
      reservedCapacity: 0,
      peakUsed: used,
      utilizationPercent: obs.utilizationPercent,
      capacityUnit: obs.capacityUnit ?? "%",
      growthRatePerDay,
      daysToExhaustion,
    });
  } catch (_err) {
    // fail-open
  }

  return {
    resourceKey: obs.resourceKey,
    resourceType: obs.resourceType,
    totalCapacity: total,
    usedCapacity: used,
    availableCapacity: available,
    utilizationPercent: obs.utilizationPercent,
    growthRatePerDay,
    daysToExhaustion,
  };
}

export async function getCapacitySummary(): Promise<(typeof resourceCapacity.$inferSelect)[]> {
  try {
    // Most recent record per resource (simplified: latest 50)
    return await db.select().from(resourceCapacity)
      .orderBy(desc(resourceCapacity.createdAt))
      .limit(50);
  } catch {
    return [];
  }
}
