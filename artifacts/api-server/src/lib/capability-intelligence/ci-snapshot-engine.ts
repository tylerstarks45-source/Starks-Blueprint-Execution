import { db } from "@workspace/db";
import { capabilitySnapshots } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import type { CapabilityProfile } from "./types";

export async function takeSnapshot(
  snapshotType: string,
  profiles: CapabilityProfile[],
  openForecasts: number,
  openOptimizations: number,
  adminRecommendationCount: number,
): Promise<void> {
  const healthyCount = profiles.filter(p => p.health === "healthy").length;
  const warningCount = profiles.filter(p => p.health === "warning").length;
  const degradedCount = profiles.filter(p => p.health === "degraded").length;
  const criticalCount = profiles.filter(p => p.health === "critical").length;
  const unavailableCount = profiles.filter(p => p.health === "unavailable" || p.health === "unknown").length;

  const avgConfidence = profiles.length > 0
    ? profiles.reduce((sum, p) => sum + p.confidence, 0) / profiles.length
    : 0;
  const avgSuccessRate = profiles.length > 0
    ? profiles.reduce((sum, p) => sum + p.successRate, 0) / profiles.length
    : 0;
  const avgLatencyMs = profiles.length > 0
    ? profiles.reduce((sum, p) => sum + p.avgLatencyMs, 0) / profiles.length
    : 0;

  try {
    await db.insert(capabilitySnapshots).values({
      snapshotType,
      totalCapabilities: profiles.length,
      healthyCount,
      warningCount,
      degradedCount,
      criticalCount,
      unavailableCount,
      avgConfidence,
      avgSuccessRate,
      avgLatencyMs,
      openForecasts,
      openOptimizations,
      adminRecommendationCount,
      capabilityDetails: profiles,
    });
  } catch (_err) {
    // fail-open
  }
}

export async function getSnapshots(limit = 10): Promise<(typeof capabilitySnapshots.$inferSelect)[]> {
  try {
    return await db
      .select()
      .from(capabilitySnapshots)
      .orderBy(desc(capabilitySnapshots.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}
