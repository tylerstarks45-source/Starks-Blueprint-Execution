import { db } from "@workspace/db";
import { adapterTelemetry, executionAdapters } from "@workspace/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { evaluateCapabilityHealth, getLatestHealth } from "./ci-health-engine";
import { measureReliability, getLatestReliability } from "./ci-reliability-engine";
import { trackAvailability, getLatestAvailability } from "./ci-availability-engine";
import { assessDependency, getDependencies } from "./ci-dependency-engine";
import { generateForecasts, getForecasts, type ForecastInput } from "./ci-forecast-engine";
import { produceOptimizations, getOptimizations, getAllOptimizations } from "./ci-optimization-engine";
import { upsertRegistry, getRegistry, getRegistryEntry } from "./ci-registry-engine";
import { takeSnapshot, getSnapshots } from "./ci-snapshot-engine";
import type {
  CapabilityEvaluationRequest,
  CapabilityEvaluationResult,
  CapabilityProfile,
  CapabilityIntelligenceSummary,
} from "./types";

// Pull telemetry stats for a capability key from the adapter_telemetry table
async function pullTelemetryStats(capabilityKey: string): Promise<{
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  interruptionCount: number;
  avgDailyExecutions: number;
}> {
  try {
    const rows = await db
      .select()
      .from(adapterTelemetry)
      .where(eq(adapterTelemetry.capabilityKey, capabilityKey))
      .orderBy(desc(adapterTelemetry.createdAt))
      .limit(500);

    if (rows.length === 0) {
      return { totalExecutions: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, interruptionCount: 0, avgDailyExecutions: 0 };
    }

    const totalExecutions = rows.length;
    const successCount = rows.filter(r => r.success).length;
    const failureCount = totalExecutions - successCount;
    const latencies = rows
      .map(r => r.latencyMs ?? 0)
      .sort((a, b) => a - b);
    const avgLatencyMs = latencies.reduce((s, v) => s + v, 0) / latencies.length;
    const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] ?? avgLatencyMs;
    const p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)] ?? avgLatencyMs;
    const interruptionCount = rows.filter(r => r.retryCount != null && (r.retryCount ?? 0) > 2).length;
    const avgDailyExecutions = totalExecutions / 7; // approximate based on last 500 entries

    return { totalExecutions, successCount, failureCount, avgLatencyMs, p95LatencyMs, p99LatencyMs, interruptionCount, avgDailyExecutions };
  } catch {
    return { totalExecutions: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, interruptionCount: 0, avgDailyExecutions: 0 };
  }
}

export async function evaluateCapability(req: CapabilityEvaluationRequest): Promise<CapabilityEvaluationResult> {
  const { capabilityKey, adapterType, adapterIds, triggeredBy = "evaluate" } = req;

  const stats = await pullTelemetryStats(capabilityKey);
  const successRate = stats.totalExecutions > 0 ? stats.successCount / stats.totalExecutions : 1;
  const errorRate = 1 - successRate;

  // 1. Health
  const health = await evaluateCapabilityHealth(capabilityKey, adapterType, successRate, stats.avgLatencyMs, triggeredBy);

  // 2. Reliability
  const reliability = await measureReliability(
    capabilityKey, adapterType,
    stats.totalExecutions, stats.successCount,
    stats.avgLatencyMs, stats.p95LatencyMs, stats.p99LatencyMs,
  );

  // 3. Availability
  const downtimeMinutes = stats.interruptionCount * 5; // heuristic: each interruption ~5 min
  const availability = await trackAvailability(
    capabilityKey, adapterType,
    7 * 24 * 60, // 7-day window in minutes
    downtimeMinutes,
    stats.interruptionCount,
    successRate,
  );

  // 4. Dependencies — seed with adapter-type as a self-dependency
  const depHealth = health.status;
  const dependency = await assessDependency(
    capabilityKey, adapterType,
    `adapter:${adapterType}`, "adapter", true, depHealth, [],
  );
  const dependencies = [dependency];

  // 5. Forecasts
  const forecastInput: ForecastInput = {
    successRate, avgLatencyMs: stats.avgLatencyMs, errorRate,
    interruptionCount: stats.interruptionCount,
    totalExecutions: stats.totalExecutions,
    avgDailyExecutions: stats.avgDailyExecutions,
  };
  const forecasts = await generateForecasts(capabilityKey, adapterType, forecastInput);

  // 6. Optimizations
  const optimizations = await produceOptimizations(capabilityKey, adapterType, {
    health: health.status,
    successRate, avgLatencyMs: stats.avgLatencyMs, errorRate,
    interruptionCount: stats.interruptionCount,
    adapterIsLatest: true,         // future: real version check
    hasDeprecatedDependency: false, // future: real deprecation check
  });

  // 7. Update registry
  await upsertRegistry(
    capabilityKey, adapterType, adapterIds,
    health.status, reliability.confidence,
    successRate, stats.avgLatencyMs,
    stats.totalExecutions, stats.failureCount,
  );

  return { capabilityKey, adapterType, health, reliability, availability, dependencies, forecasts, optimizations };
}

export async function buildIntelligenceSummary(): Promise<CapabilityIntelligenceSummary> {
  try {
    const registry = await getRegistry();
    const allOptimizations = await getAllOptimizations(true);

    const total = registry.length;
    const healthy = registry.filter(r => r.currentHealth === "healthy").length;
    const warning = registry.filter(r => r.currentHealth === "warning").length;
    const degraded = registry.filter(r => r.currentHealth === "degraded").length;
    const critical = registry.filter(r => r.currentHealth === "critical").length;
    const unavailable = registry.filter(r => r.currentHealth === "unavailable" || r.currentHealth === "unknown").length;
    const avgConfidence = total > 0 ? registry.reduce((s, r) => s + r.overallConfidence, 0) / total : 0;
    const avgSuccessRate = total > 0 ? registry.reduce((s, r) => s + r.successRate, 0) / total : 0;

    const openForecasts = 0; // approximate — a full count would require a separate query
    const openOptimizations = allOptimizations.filter(o => !o.isAdminRecommendation).length;
    const adminRecommendationCount = allOptimizations.filter(o => o.isAdminRecommendation).length;

    const topRisks = registry
      .filter(r => r.currentHealth === "critical" || r.currentHealth === "degraded")
      .slice(0, 3)
      .map(r => r.capabilityKey);

    const topOptimizations = allOptimizations
      .filter(o => !o.isAdminRecommendation)
      .slice(0, 3)
      .map(o => o.title);

    return {
      totalCapabilities: total,
      healthyCapabilities: healthy,
      warningCapabilities: warning,
      degradedCapabilities: degraded,
      criticalCapabilities: critical,
      unavailableCapabilities: unavailable,
      avgConfidence,
      avgSuccessRate,
      openForecasts,
      openOptimizations,
      adminRecommendationCount,
      topRisks,
      topOptimizations,
      evaluatedAt: new Date(),
    };
  } catch {
    return {
      totalCapabilities: 0, healthyCapabilities: 0, warningCapabilities: 0,
      degradedCapabilities: 0, criticalCapabilities: 0, unavailableCapabilities: 0,
      avgConfidence: 0, avgSuccessRate: 0, openForecasts: 0, openOptimizations: 0,
      adminRecommendationCount: 0, topRisks: [], topOptimizations: [],
      evaluatedAt: new Date(),
    };
  }
}

export async function takeIntelligenceSnapshot(snapshotType = "scheduled"): Promise<void> {
  try {
    const registry = await getRegistry();
    const allOptimizations = await getAllOptimizations(true);
    const adminCount = allOptimizations.filter(o => o.isAdminRecommendation).length;
    const openOptimizations = allOptimizations.filter(o => !o.isAdminRecommendation).length;

    const profiles: CapabilityProfile[] = registry.map(r => ({
      capabilityKey: r.capabilityKey,
      adapterType: r.adapterType,
      health: r.currentHealth as any,
      readiness: r.currentReadiness,
      confidence: r.overallConfidence,
      successRate: r.successRate,
      avgLatencyMs: r.avgLatencyMs,
      totalExecutions: r.totalExecutions,
      openForecasts: 0,
      openOptimizations: 0,
    }));

    await takeSnapshot(snapshotType, profiles, 0, openOptimizations, adminCount);
  } catch (_err) {
    // fail-open
  }
}

export { getRegistry, getRegistryEntry, getSnapshots, getOptimizations, getAllOptimizations, getForecasts };
