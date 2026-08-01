import { db } from "@workspace/db";
import { resourceRecommendations, resourceAlerts } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type {
  ResourceObservation,
  CapacityAssessment,
  InfraForecastResult,
  InfraRecommendationResult,
  InfraAlertResult,
  RecommendationType,
  PressureLevel,
  PerformanceMeasurement,
} from "./types";

// ── Alert generation ─────────────────────────────────────────
export async function generateAlerts(resources: ResourceObservation[]): Promise<InfraAlertResult[]> {
  const alerts: InfraAlertResult[] = [];

  for (const r of resources) {
    if (r.utilizationPercent >= 90) {
      const alert: InfraAlertResult = {
        resourceKey: r.resourceKey,
        resourceType: r.resourceType,
        alertType: "utilization_high",
        severity: "critical",
        message: `${r.resourceName} utilization is at ${r.utilizationPercent.toFixed(1)}% — critical threshold exceeded.`,
        currentValue: r.utilizationPercent,
        thresholdValue: 90,
        isAdminOnly: true,
      };
      alerts.push(alert);
      try {
        await db.insert(resourceAlerts).values({
          resourceKey: alert.resourceKey,
          resourceType: alert.resourceType,
          alertType: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          currentValue: alert.currentValue,
          thresholdValue: alert.thresholdValue,
          isAdminOnly: alert.isAdminOnly,
        });
      } catch (_err) { /* fail-open */ }
    } else if (r.utilizationPercent >= 80) {
      const alert: InfraAlertResult = {
        resourceKey: r.resourceKey,
        resourceType: r.resourceType,
        alertType: "utilization_high",
        severity: "high",
        message: `${r.resourceName} utilization is at ${r.utilizationPercent.toFixed(1)}% — approaching capacity limit.`,
        currentValue: r.utilizationPercent,
        thresholdValue: 80,
        isAdminOnly: true,
      };
      alerts.push(alert);
      try {
        await db.insert(resourceAlerts).values({
          resourceKey: alert.resourceKey,
          resourceType: alert.resourceType,
          alertType: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          currentValue: alert.currentValue,
          thresholdValue: alert.thresholdValue,
          isAdminOnly: alert.isAdminOnly,
        });
      } catch (_err) { /* fail-open */ }
    }
  }

  return alerts;
}

// ── Recommendation generation ─────────────────────────────────
const RECOMMENDATION_MAP: Record<string, RecommendationType> = {
  cpu: "cpu_scaling",
  ram: "ram_expansion",
  gpu: "gpu_expansion",
  gpu_memory: "gpu_expansion",
  storage: "storage_expansion",
  database: "database_scaling",
  vector_db: "vector_db_scaling",
  execution_queue: "queue_optimization",
  model_provider: "model_provider_optimization",
  api_quota: "model_provider_optimization",
  cache: "cache_optimization",
  browser_pool: "browser_pool_expansion",
  worker_pool: "worker_scaling",
  execution_throughput: "worker_scaling",
  network: "inference_migration",
};

const RECOMMENDATION_TITLES: Record<RecommendationType, string> = {
  gpu_expansion: "Expand GPU capacity",
  ram_expansion: "Expand system RAM",
  cpu_scaling: "Scale CPU allocation",
  worker_scaling: "Scale worker pool",
  database_scaling: "Scale database capacity",
  vector_db_scaling: "Scale vector database",
  storage_expansion: "Expand storage capacity",
  model_provider_optimization: "Optimize model provider configuration",
  queue_optimization: "Optimize execution queue",
  browser_pool_expansion: "Expand browser pool",
  cache_optimization: "Optimize cache configuration",
  search_expansion: "Expand search infrastructure",
  inference_migration: "Evaluate inference provider migration",
};

export async function generateRecommendations(
  resources: ResourceObservation[],
  capacities: CapacityAssessment[],
  forecasts: InfraForecastResult[],
  performance: PerformanceMeasurement,
): Promise<InfraRecommendationResult[]> {
  const recommendations: InfraRecommendationResult[] = [];
  const processed = new Set<string>();

  // From high-utilization resources
  for (const r of resources) {
    if (r.utilizationPercent < 70) continue;
    if (processed.has(r.resourceType)) continue;
    processed.add(r.resourceType);

    const recType = RECOMMENDATION_MAP[r.resourceType];
    if (!recType) continue;

    const priority: PressureLevel = r.utilizationPercent >= 90 ? "critical"
      : r.utilizationPercent >= 80 ? "high" : "medium";

    const capacity = capacities.find(c => c.resourceKey === r.resourceKey);
    const forecast = forecasts.find(f => f.resourceKey === r.resourceKey);
    const confidence = Math.min(0.95, r.utilizationPercent / 100);

    const rec: InfraRecommendationResult = {
      resourceKey: r.resourceKey,
      resourceType: r.resourceType,
      recommendationType: recType,
      priority,
      title: RECOMMENDATION_TITLES[recType],
      description: `${r.resourceName} is at ${r.utilizationPercent.toFixed(1)}% utilization, exceeding the 70% planning threshold.`,
      evidence: `Current utilization: ${r.utilizationPercent.toFixed(1)}%. Pressure level: ${r.pressureLevel}.`,
      currentUtilization: r.utilizationPercent,
      historicalTrend: `Trending at ${capacity?.growthRatePerDay.toFixed(2) ?? "0.50"}% daily growth`,
      predictedExhaustion: forecast
        ? `Exhaustion forecast in ${forecast.horizonDays} days at ${forecast.projectedUtilization.toFixed(1)}% projected utilization`
        : undefined,
      expectedImprovement: `Reduce utilization to below 60%, extending runway by at least 30 days`,
      estimatedCostImpact: "Consult cloud provider pricing for current region",
      confidence,
      alternatives: [
        "Optimize existing workloads to reduce resource consumption",
        "Implement request throttling during peak periods",
        "Enable horizontal scaling if supported by workload type",
      ],
      risksIfIgnored: `Without action, ${r.resourceName} will reach critical utilization, causing performance degradation and potential service unavailability.`,
    };

    recommendations.push(rec);

    try {
      await db.insert(resourceRecommendations).values({
        resourceKey: rec.resourceKey,
        resourceType: rec.resourceType,
        recommendationType: rec.recommendationType,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        evidence: rec.evidence,
        currentUtilization: rec.currentUtilization,
        historicalTrend: rec.historicalTrend,
        predictedExhaustion: rec.predictedExhaustion,
        expectedImprovement: rec.expectedImprovement,
        estimatedCostImpact: rec.estimatedCostImpact,
        confidence: rec.confidence,
        alternatives: rec.alternatives,
        risksIfIgnored: rec.risksIfIgnored,
        isAdminOnly: true,
      });
    } catch (_err) { /* fail-open */ }
  }

  // Bottleneck recommendation
  if (performance.bottleneckResource && performance.bottleneckSeverity !== "none") {
    const bottleneckType = performance.bottleneckResource.split(":")[0] as string;
    const recType = RECOMMENDATION_MAP[bottleneckType];
    if (recType && !processed.has(`bottleneck:${recType}`)) {
      processed.add(`bottleneck:${recType}`);
      const rec: InfraRecommendationResult = {
        resourceKey: performance.bottleneckResource,
        resourceType: (bottleneckType ?? "cpu") as any,
        recommendationType: recType,
        priority: performance.bottleneckSeverity === "critical" ? "critical" : "high",
        title: `Resolve bottleneck: ${RECOMMENDATION_TITLES[recType]}`,
        description: `${performance.bottleneckResource} is identified as the primary platform bottleneck with ${performance.bottleneckSeverity} severity.`,
        evidence: `Platform efficiency score: ${(performance.efficiencyScore * 100).toFixed(1)}%. Bottleneck detected at ${performance.bottleneckResource}.`,
        expectedImprovement: "Resolving primary bottleneck typically improves end-to-end platform efficiency by 20–40%.",
        confidence: 0.80,
        alternatives: ["Load-balance across multiple instances", "Optimize the specific workload causing the bottleneck"],
        risksIfIgnored: "Unresolved bottlenecks compound over time, causing cascading degradation across dependent resources.",
      };
      recommendations.push(rec);
      try {
        await db.insert(resourceRecommendations).values({
          resourceKey: rec.resourceKey,
          resourceType: rec.resourceType,
          recommendationType: rec.recommendationType,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          evidence: rec.evidence,
          expectedImprovement: rec.expectedImprovement,
          confidence: rec.confidence,
          alternatives: rec.alternatives,
          risksIfIgnored: rec.risksIfIgnored,
          isAdminOnly: true,
        });
      } catch (_err) { /* fail-open */ }
    }
  }

  return recommendations;
}

export async function getRecommendations(): Promise<(typeof resourceRecommendations.$inferSelect)[]> {
  try {
    return await db.select().from(resourceRecommendations)
      .where(eq(resourceRecommendations.isApplied, false))
      .orderBy(desc(resourceRecommendations.generatedAt))
      .limit(50);
  } catch {
    return [];
  }
}

export async function getAlerts(includeAcknowledged = false): Promise<(typeof resourceAlerts.$inferSelect)[]> {
  try {
    const rows = await db.select().from(resourceAlerts)
      .orderBy(desc(resourceAlerts.triggeredAt))
      .limit(100);
    return includeAcknowledged ? rows : rows.filter(r => !r.isAcknowledged);
  } catch {
    return [];
  }
}
