import { db } from "@workspace/db";
import { infrastructureSnapshots, platformInfrastructureRegistry } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { discoverResources } from "./pii-discovery-engine";
import { persistResourceHealth, upsertInfraRegistry, getAllHealthSummary } from "./pii-health-engine";
import { assessCapacity, getCapacitySummary } from "./pii-capacity-engine";
import { generateInfraForecasts, getForecasts } from "./pii-forecast-engine";
import { persistDependencies } from "./pii-dependency-engine";
import { measurePerformance, getPerformanceHistory } from "./pii-performance-engine";
import { generateAlerts, generateRecommendations, getRecommendations, getAlerts } from "./pii-recommendation-engine";
import type {
  InfrastructureScanResult,
  PlatformInfrastructureSummary,
  PlatformReadiness,
  PressureLevel,
  InfraHealthStatus,
} from "./types";

function computePlatformReadiness(
  healthyCount: number,
  warningCount: number,
  degradedCount: number,
  criticalCount: number,
  total: number,
): PlatformReadiness {
  if (total === 0) return "unknown";
  const criticalRatio = criticalCount / total;
  const degradedRatio = degradedCount / total;
  if (criticalRatio >= 0.3) return "unavailable";
  if (criticalRatio > 0 || degradedRatio >= 0.3) return "degraded";
  if (degradedRatio > 0 || warningCount > 0) return "limited";
  return "ready";
}

function computeOverallPressure(resources: { utilizationPercent: number }[]): PressureLevel {
  if (resources.length === 0) return "none";
  const max = Math.max(...resources.map(r => r.utilizationPercent));
  if (max >= 90) return "critical";
  if (max >= 80) return "high";
  if (max >= 65) return "medium";
  if (max >= 50) return "low";
  return "none";
}

export async function runInfrastructureScan(triggeredBy = "scan"): Promise<InfrastructureScanResult> {
  // 1. Discover resources (heuristic baseline; real values via EP_PII_RESOURCE_DISCOVERED)
  const resources = discoverResources();

  // 2. Persist health + upsert registry
  for (const obs of resources) {
    await persistResourceHealth(obs, triggeredBy);
    await upsertInfraRegistry(obs);
  }

  // 3. Assess capacity
  const capacities = await Promise.all(resources.map(r => assessCapacity(r)));

  // 4. Generate forecasts from capacity
  const forecasts = await generateInfraForecasts(capacities);

  // 5. Map dependencies
  const healthMap = new Map<string, InfraHealthStatus>(
    resources.map(r => [r.resourceKey, r.health])
  );
  await persistDependencies(healthMap);

  // 6. Measure performance
  const performance = await measurePerformance(resources);

  // 7. Generate alerts
  const alerts = await generateAlerts(resources);

  // 8. Generate recommendations (admin-only)
  const recommendations = await generateRecommendations(resources, capacities, forecasts, performance);

  // 9. Compute summary
  const healthy = resources.filter(r => r.health === "healthy").length;
  const warning = resources.filter(r => r.health === "warning").length;
  const degraded = resources.filter(r => r.health === "degraded").length;
  const critical = resources.filter(r => r.health === "critical").length;
  const unavailable = resources.filter(r => r.health === "unavailable" || r.health === "unknown").length;

  const platformReadiness = computePlatformReadiness(healthy, warning, degraded, critical, resources.length);
  const overallPressure = computeOverallPressure(resources);

  // 10. Persist snapshot
  try {
    const avgUtil = resources.length > 0
      ? resources.reduce((s, r) => s + r.utilizationPercent, 0) / resources.length
      : 0;
    await db.insert(infrastructureSnapshots).values({
      snapshotType: triggeredBy,
      totalResources: resources.length,
      healthyCount: healthy,
      warningCount: warning,
      degradedCount: degraded,
      criticalCount: critical,
      unavailableCount: unavailable,
      avgUtilizationPercent: avgUtil,
      overallPressure,
      platformReadiness,
      openAlerts: alerts.length,
      openForecasts: forecasts.length,
      adminRecommendationCount: recommendations.length,
      resourceDetails: resources.map(r => ({
        key: r.resourceKey, type: r.resourceType, health: r.health, util: r.utilizationPercent,
      })),
      performanceSummary: {
        efficiencyScore: performance.efficiencyScore,
        bottleneck: performance.bottleneckResource,
        bottleneckSeverity: performance.bottleneckSeverity,
      },
    });
  } catch (_err) {
    // fail-open
  }

  return { resources, capacities, forecasts, alerts, recommendations, performance, platformReadiness, overallPressure };
}

export async function buildInfrastructureSummary(): Promise<PlatformInfrastructureSummary> {
  try {
    const registry = await getAllHealthSummary();
    const openRecs = await getRecommendations();
    const openAlerts = await getAlerts();

    const total = registry.length;
    const healthy = registry.filter(r => r.currentHealth === "healthy").length;
    const warning = registry.filter(r => r.currentHealth === "warning").length;
    const degraded = registry.filter(r => r.currentHealth === "degraded").length;
    const critical = registry.filter(r => r.currentHealth === "critical").length;

    const avgUtil = total > 0
      ? registry.reduce((s, r) => s + r.currentUtilizationPercent, 0) / total
      : 0;

    const overallPressure = computeOverallPressure(registry.map(r => ({ utilizationPercent: r.currentUtilizationPercent })));
    const platformReadiness = computePlatformReadiness(healthy, warning, degraded, critical, total);

    const topPressured = registry
      .filter(r => r.pressureLevel === "critical" || r.pressureLevel === "high")
      .sort((a, b) => b.currentUtilizationPercent - a.currentUtilizationPercent)
      .slice(0, 3)
      .map(r => r.resourceKey);

    // Performance efficiency from latest performance record
    const perfHistory = await getPerformanceHistory(1);
    const performanceScore = perfHistory[0]?.efficiencyScore ?? 0;

    return {
      totalResources: total,
      healthyResources: healthy,
      warningResources: warning,
      degradedResources: degraded,
      criticalResources: critical,
      avgUtilizationPercent: avgUtil,
      overallPressure,
      platformReadiness,
      openAlerts: openAlerts.length,
      openForecasts: 0,
      adminRecommendationCount: openRecs.length,
      topPressuredResources: topPressured,
      performanceScore,
      scannedAt: new Date(),
    };
  } catch {
    return {
      totalResources: 0, healthyResources: 0, warningResources: 0, degradedResources: 0,
      criticalResources: 0, avgUtilizationPercent: 0, overallPressure: "none",
      platformReadiness: "unknown", openAlerts: 0, openForecasts: 0,
      adminRecommendationCount: 0, topPressuredResources: [], performanceScore: 0,
      scannedAt: new Date(),
    };
  }
}

export async function getInfraSnapshots(limit = 10): Promise<(typeof infrastructureSnapshots.$inferSelect)[]> {
  try {
    return await db.select().from(infrastructureSnapshots)
      .orderBy(desc(infrastructureSnapshots.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export { getAllHealthSummary, getCapacitySummary, getForecasts, getRecommendations, getAlerts, getPerformanceHistory };
