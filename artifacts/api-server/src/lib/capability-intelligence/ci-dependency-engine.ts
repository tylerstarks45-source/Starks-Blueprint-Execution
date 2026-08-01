import { db } from "@workspace/db";
import { ciCapabilityDependencies } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CapabilityDependencyResult, DependencyType, RiskLevel, CapabilityHealthStatus } from "./types";

// Upstream risk: escalated when the dependency itself is degraded/critical
function calculateUpstreamRisk(dependencyHealth: CapabilityHealthStatus, isRequired: boolean): RiskLevel {
  if (!isRequired) return "low";
  switch (dependencyHealth) {
    case "healthy": return "low";
    case "warning": return "medium";
    case "degraded": return "high";
    case "critical":
    case "unavailable": return "critical";
    default: return "low";
  }
}

// Downstream impact mirrors upstream risk for required deps
function calculateDownstreamImpact(upstreamRisk: RiskLevel, sharedCount: number): RiskLevel {
  if (sharedCount > 3) {
    // Shared dependencies have amplified downstream impact
    const escalated: Record<RiskLevel, RiskLevel> = { low: "medium", medium: "high", high: "critical", critical: "critical" };
    return escalated[upstreamRisk];
  }
  return upstreamRisk;
}

export async function assessDependency(
  capabilityKey: string,
  adapterType: string,
  dependencyKey: string,
  dependencyType: DependencyType,
  isRequired: boolean,
  dependencyHealth: CapabilityHealthStatus,
  sharedWith: string[] = [],
): Promise<CapabilityDependencyResult> {
  const upstreamRisk = calculateUpstreamRisk(dependencyHealth, isRequired);
  const downstreamImpact = calculateDownstreamImpact(upstreamRisk, sharedWith.length);

  try {
    await db.insert(ciCapabilityDependencies).values({
      capabilityKey,
      adapterType,
      dependencyKey,
      dependencyType,
      isRequired,
      dependencyHealth,
      upstreamRisk,
      downstreamImpact,
      sharedWith,
    });
  } catch (_err) {
    // fail-open
  }

  return {
    capabilityKey, adapterType, dependencyKey, dependencyType,
    isRequired, dependencyHealth, upstreamRisk, downstreamImpact, sharedWith,
  };
}

export async function getDependencies(capabilityKey: string): Promise<(typeof ciCapabilityDependencies.$inferSelect)[]> {
  try {
    return await db
      .select()
      .from(ciCapabilityDependencies)
      .where(eq(ciCapabilityDependencies.capabilityKey, capabilityKey))
      .orderBy(desc(ciCapabilityDependencies.createdAt))
      .limit(20);
  } catch {
    return [];
  }
}
