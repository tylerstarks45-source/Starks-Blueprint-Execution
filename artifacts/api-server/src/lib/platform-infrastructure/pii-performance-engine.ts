import { db } from "@workspace/db";
import { platformPerformance } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import type { ResourceObservation, PerformanceMeasurement } from "./types";

// Determine the most constrained resource (bottleneck).
function detectBottleneck(resources: ResourceObservation[]): { key: string; severity: string } | null {
  const critical = resources.filter(r => r.utilizationPercent >= 90 || r.pressureLevel === "critical");
  if (critical.length > 0) {
    const worst = critical.sort((a, b) => b.utilizationPercent - a.utilizationPercent)[0];
    return { key: worst.resourceKey, severity: "critical" };
  }
  const high = resources.filter(r => r.utilizationPercent >= 80);
  if (high.length > 0) {
    const worst = high.sort((a, b) => b.utilizationPercent - a.utilizationPercent)[0];
    return { key: worst.resourceKey, severity: "high" };
  }
  return null;
}

// Efficiency score: 1.0 = all resources well-utilized (20–60%), 0.0 = critical overload or near-idle waste.
function computeEfficiency(resources: ResourceObservation[]): number {
  if (resources.length === 0) return 0;
  const scores = resources.map(r => {
    const u = r.utilizationPercent;
    // Optimal band 20–60%: full score. Over 80% or under 5% penalized.
    if (u >= 20 && u <= 60) return 1.0;
    if (u > 80) return Math.max(0, 1 - (u - 80) / 20);
    if (u < 5) return 0.5;
    return 0.8;
  });
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}

export async function measurePerformance(resources: ResourceObservation[]): Promise<PerformanceMeasurement> {
  const bottleneck = detectBottleneck(resources);
  const efficiencyScore = computeEfficiency(resources);
  const avgUtil = resources.length > 0
    ? resources.reduce((s, r) => s + r.utilizationPercent, 0) / resources.length
    : 0;
  const avgErrorRate = resources.length > 0
    ? resources.reduce((s, r) => s + r.errorRate, 0) / resources.length
    : 0;

  // Throughput is derived from execution_throughput resource if available
  const throughputResource = resources.find(r => r.resourceType === "execution_throughput");
  const queueResource = resources.find(r => r.resourceType === "execution_queue");
  const workerResource = resources.find(r => r.resourceType === "worker_pool");

  const measurement: PerformanceMeasurement = {
    measurementType: "utilization",
    throughputRpm: throughputResource ? throughputResource.utilizationPercent : undefined,
    avgLatencyMs: undefined, // real latency arrives via EP_PII_PERFORMANCE_MEASURED
    p95LatencyMs: undefined,
    p99LatencyMs: undefined,
    concurrentWorkers: workerResource ? Math.round(workerResource.utilizationPercent / 10) : undefined,
    queueDepth: queueResource ? Math.round(queueResource.utilizationPercent / 5) : undefined,
    errorRate: avgErrorRate,
    utilizationPercent: avgUtil,
    efficiencyScore,
    bottleneckResource: bottleneck?.key,
    bottleneckSeverity: bottleneck?.severity ?? "none",
  };

  try {
    await db.insert(platformPerformance).values({
      measurementType: measurement.measurementType,
      throughputRpm: measurement.throughputRpm,
      avgLatencyMs: measurement.avgLatencyMs,
      p95LatencyMs: measurement.p95LatencyMs,
      p99LatencyMs: measurement.p99LatencyMs,
      concurrentWorkers: measurement.concurrentWorkers,
      queueDepth: measurement.queueDepth,
      errorRate: measurement.errorRate,
      utilizationPercent: measurement.utilizationPercent,
      efficiencyScore: measurement.efficiencyScore,
      bottleneckResource: measurement.bottleneckResource,
      bottleneckSeverity: measurement.bottleneckSeverity,
    });
  } catch (_err) {
    // fail-open
  }

  return measurement;
}

export async function getPerformanceHistory(limit = 20): Promise<(typeof platformPerformance.$inferSelect)[]> {
  try {
    return await db.select().from(platformPerformance)
      .orderBy(desc(platformPerformance.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}
