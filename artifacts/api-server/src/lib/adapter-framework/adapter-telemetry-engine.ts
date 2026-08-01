// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Adapter Telemetry Engine
// Collects: latency, failures, retries, health, usage, capability utilization,
// confidence, success rate.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { adapterTelemetry } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const logger = { warn: console.warn.bind(console) };

export interface TelemetryRecord {
  adapterId: string;
  sessionId?: string;
  executionClass: string;
  actionType: string;
  latencyMs: number;
  success: boolean;
  retryCount: number;
  errorType: string;
  capabilityKey: string;
}

/**
 * Persist a telemetry record for an adapter execution.
 * Fail-open — telemetry errors must never block the execution path.
 */
export async function recordTelemetry(rec: TelemetryRecord): Promise<void> {
  try {
    await db.insert(adapterTelemetry).values({
      id:             `tel-${randomUUID()}`,
      adapterId:      rec.adapterId,
      sessionId:      rec.sessionId ?? null,
      executionClass: rec.executionClass,
      actionType:     rec.actionType,
      latencyMs:      rec.latencyMs,
      success:        rec.success,
      retryCount:     rec.retryCount,
      errorType:      rec.errorType,
      capabilityKey:  rec.capabilityKey,
    });
  } catch (err) {
    logger.warn({ err, adapterId: rec.adapterId }, "adapter-telemetry-engine: record failed (fail-open)");
  }
}

/**
 * Compute aggregate telemetry metrics for an adapter.
 */
export async function getAdapterMetrics(adapterId: string): Promise<{
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgLatencyMs: number;
  totalRetries: number;
  confidence: number;
}> {
  try {
    const rows = await db
      .select()
      .from(adapterTelemetry)
      .where(eq(adapterTelemetry.adapterId, adapterId));

    if (rows.length === 0) {
      return { totalExecutions: 0, successCount: 0, failureCount: 0, successRate: 1.0, avgLatencyMs: 0, totalRetries: 0, confidence: 0.5 };
    }

    const successCount = rows.filter(r => r.success).length;
    const failureCount = rows.length - successCount;
    const successRate  = successCount / rows.length;
    const avgLatencyMs = rows.reduce((sum, r) => sum + r.latencyMs, 0) / rows.length;
    const totalRetries = rows.reduce((sum, r) => sum + r.retryCount, 0);

    // Confidence: success rate × 0.7 + (1 - normalised latency penalty) × 0.3
    const latencyPenalty = Math.min(avgLatencyMs / 5000, 1.0);
    const confidence = successRate * 0.7 + (1 - latencyPenalty) * 0.3;

    return { totalExecutions: rows.length, successCount, failureCount, successRate, avgLatencyMs, totalRetries, confidence };
  } catch {
    return { totalExecutions: 0, successCount: 0, failureCount: 0, successRate: 1.0, avgLatencyMs: 0, totalRetries: 0, confidence: 0.5 };
  }
}
