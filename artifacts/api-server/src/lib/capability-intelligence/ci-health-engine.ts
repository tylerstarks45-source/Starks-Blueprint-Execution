import { db } from "@workspace/db";
import { ciCapabilityHealth, ciCapabilityRegistry } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CapabilityHealthStatus, CapabilityHealthResult } from "./types";

// Thresholds for deterministic health classification
const SUCCESS_RATE_HEALTHY = 0.95;
const SUCCESS_RATE_WARNING = 0.85;
const SUCCESS_RATE_DEGRADED = 0.70;
const SUCCESS_RATE_CRITICAL = 0.50;

const LATENCY_WARNING_MS = 2000;
const LATENCY_DEGRADED_MS = 5000;
const LATENCY_CRITICAL_MS = 10000;

function classifyHealth(successRate: number, latencyMs: number): CapabilityHealthStatus {
  if (successRate >= SUCCESS_RATE_HEALTHY && latencyMs < LATENCY_WARNING_MS) return "healthy";
  if (successRate >= SUCCESS_RATE_WARNING && latencyMs < LATENCY_DEGRADED_MS) return "warning";
  if (successRate >= SUCCESS_RATE_DEGRADED && latencyMs < LATENCY_CRITICAL_MS) return "degraded";
  if (successRate >= SUCCESS_RATE_CRITICAL) return "critical";
  return "unavailable";
}

export async function evaluateCapabilityHealth(
  capabilityKey: string,
  adapterType: string,
  successRate: number,
  avgLatencyMs: number,
  triggeredBy: string = "evaluate",
): Promise<CapabilityHealthResult> {
  const errorRate = 1 - successRate;
  const status = classifyHealth(successRate, avgLatencyMs);

  const diagnostics: Record<string, unknown> = {
    successRate,
    errorRate,
    avgLatencyMs,
    thresholds: {
      successRateHealthy: SUCCESS_RATE_HEALTHY,
      latencyWarningMs: LATENCY_WARNING_MS,
    },
  };

  try {
    await db.insert(ciCapabilityHealth).values({
      capabilityKey,
      adapterType,
      status,
      latencyMs: avgLatencyMs,
      successRate,
      errorRate,
      triggeredBy,
      diagnostics,
    });
  } catch (_err) {
    // fail-open: health evaluation should not block caller
  }

  return { capabilityKey, adapterType, status, successRate, errorRate, latencyMs: avgLatencyMs, diagnostics };
}

export async function getLatestHealth(capabilityKey: string): Promise<typeof ciCapabilityHealth.$inferSelect | null> {
  try {
    const rows = await db
      .select()
      .from(ciCapabilityHealth)
      .where(eq(ciCapabilityHealth.capabilityKey, capabilityKey))
      .orderBy(desc(ciCapabilityHealth.createdAt))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getHealthHistory(capabilityKey: string, limit = 20): Promise<(typeof ciCapabilityHealth.$inferSelect)[]> {
  try {
    return await db
      .select()
      .from(ciCapabilityHealth)
      .where(eq(ciCapabilityHealth.capabilityKey, capabilityKey))
      .orderBy(desc(ciCapabilityHealth.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}
