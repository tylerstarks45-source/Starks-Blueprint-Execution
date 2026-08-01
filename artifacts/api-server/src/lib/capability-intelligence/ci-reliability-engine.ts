import { db } from "@workspace/db";
import { capabilityReliability } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CapabilityReliabilityResult } from "./types";

// Confidence formula: successRate*0.5 + consistencyScore*0.3 + recoveryRate*0.2
function computeConfidence(successRate: number, consistencyScore: number, recoveryRate: number): number {
  return Math.min(1, successRate * 0.5 + consistencyScore * 0.3 + recoveryRate * 0.2);
}

// Consistency: lower variance → higher score. A simple heuristic: p99/avgLatency ratio.
function computeConsistency(avgLatencyMs: number, p99LatencyMs: number): number {
  if (avgLatencyMs <= 0) return 1;
  const ratio = p99LatencyMs / avgLatencyMs; // 1 = no variance, higher = worse
  return Math.max(0, 1 - (ratio - 1) / 5); // variance factor: ratio > 6x → 0
}

export async function measureReliability(
  capabilityKey: string,
  adapterType: string,
  totalExecutions: number,
  successCount: number,
  avgLatencyMs: number,
  p95LatencyMs: number,
  p99LatencyMs: number,
  windowDays = 7,
): Promise<CapabilityReliabilityResult> {
  const failureCount = totalExecutions - successCount;
  const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0;
  const failureRate = totalExecutions > 0 ? failureCount / totalExecutions : 0;

  // Recovery rate: heuristic — if error rate is low, recovery is high
  const recoveryRate = Math.min(1, 1 - failureRate * 2);
  const consistencyScore = computeConsistency(avgLatencyMs, p99LatencyMs);
  const confidence = computeConfidence(successRate, consistencyScore, recoveryRate);

  try {
    await db.insert(capabilityReliability).values({
      capabilityKey,
      adapterType,
      windowDays,
      totalExecutions,
      successCount,
      failureCount,
      successRate,
      failureRate,
      avgLatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      recoveryRate,
      consistencyScore,
      confidence,
    });
  } catch (_err) {
    // fail-open
  }

  return {
    capabilityKey, adapterType, windowDays, totalExecutions, successCount, failureCount,
    successRate, failureRate, avgLatencyMs, p95LatencyMs, p99LatencyMs,
    recoveryRate, consistencyScore, confidence,
  };
}

export async function getLatestReliability(capabilityKey: string): Promise<typeof capabilityReliability.$inferSelect | null> {
  try {
    const rows = await db
      .select()
      .from(capabilityReliability)
      .where(eq(capabilityReliability.capabilityKey, capabilityKey))
      .orderBy(desc(capabilityReliability.createdAt))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
