import { db } from "@workspace/db";
import { capabilityForecasts } from "@workspace/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import type { CapabilityForecastResult, ForecastType, RiskLevel } from "./types";

// Deterministic forecast logic — no AI, no randomness.

interface ForecastInput {
  successRate: number;
  avgLatencyMs: number;
  errorRate: number;
  interruptionCount: number;
  totalExecutions: number;
  avgDailyExecutions: number;
}

function buildForecasts(capabilityKey: string, adapterType: string, input: ForecastInput): CapabilityForecastResult[] {
  const forecasts: CapabilityForecastResult[] = [];

  // Forecast 1: Degradation risk — if success rate is declining
  if (input.successRate < 0.95) {
    const severity: RiskLevel = input.successRate < 0.70 ? "critical" : input.successRate < 0.85 ? "high" : "medium";
    const probability = Math.min(1, (0.95 - input.successRate) * 3);
    forecasts.push({
      capabilityKey, adapterType,
      forecastType: "degradation",
      severity,
      probability,
      horizonDays: 7,
      triggerCondition: `Success rate ${(input.successRate * 100).toFixed(1)}% below healthy threshold (95%)`,
      currentValue: input.successRate * 100,
      thresholdValue: 95,
      rationale: `Current success rate of ${(input.successRate * 100).toFixed(1)}% suggests continued degradation without intervention.`,
      recommendedAction: "Review adapter health, check for upstream service issues, consider failover.",
      isAdminOnly: false,
    });
  }

  // Forecast 2: Rate-limit risk — if latency is high and error rate is rising
  if (input.avgLatencyMs > 3000 && input.errorRate > 0.1) {
    forecasts.push({
      capabilityKey, adapterType,
      forecastType: "rate_limit",
      severity: "medium",
      probability: Math.min(1, (input.avgLatencyMs / 5000) * 0.6),
      horizonDays: 3,
      triggerCondition: `Avg latency ${input.avgLatencyMs.toFixed(0)}ms + error rate ${(input.errorRate * 100).toFixed(1)}%`,
      currentValue: input.avgLatencyMs,
      thresholdValue: 3000,
      rationale: "Elevated latency combined with error rate may indicate rate-limiting or quota exhaustion.",
      recommendedAction: "Monitor quota consumption, reduce request volume, or request quota increase.",
      isAdminOnly: false,
    });
  }

  // Forecast 3: Capacity exhaustion — if daily execution volume is high (admin-only)
  if (input.avgDailyExecutions > 500) {
    const daysToExhaustion = Math.round(10000 / input.avgDailyExecutions); // assume 10k monthly quota
    forecasts.push({
      capabilityKey, adapterType,
      forecastType: "capacity_exhaustion",
      severity: daysToExhaustion < 7 ? "critical" : daysToExhaustion < 30 ? "high" : "medium",
      probability: Math.min(1, 500 / input.avgDailyExecutions * 0.5),
      horizonDays: daysToExhaustion,
      triggerCondition: `${input.avgDailyExecutions.toFixed(0)} daily executions at estimated quota`,
      currentValue: input.avgDailyExecutions,
      thresholdValue: 10000 / 30, // monthly quota spread daily
      rationale: `At ${input.avgDailyExecutions.toFixed(0)} daily executions, quota may exhaust in ~${daysToExhaustion} days.`,
      recommendedAction: "Review quota plan, increase quota limit, or implement execution budgeting.",
      isAdminOnly: true,
    });
  }

  // Forecast 4: Version incompatibility — generic advisory
  if (input.errorRate > 0.15 && input.successRate < 0.90) {
    forecasts.push({
      capabilityKey, adapterType,
      forecastType: "version_incompatibility",
      severity: "low",
      probability: 0.2,
      horizonDays: 30,
      triggerCondition: `Error rate ${(input.errorRate * 100).toFixed(1)}% above 15% threshold`,
      currentValue: input.errorRate * 100,
      thresholdValue: 15,
      rationale: "Sustained error rates above 15% may indicate API version drift or breaking changes.",
      recommendedAction: "Review adapter API documentation for deprecation notices or breaking changes.",
      isAdminOnly: false,
    });
  }

  return forecasts;
}

export async function generateForecasts(
  capabilityKey: string,
  adapterType: string,
  input: ForecastInput,
): Promise<CapabilityForecastResult[]> {
  const forecasts = buildForecasts(capabilityKey, adapterType, input);

  try {
    for (const f of forecasts) {
      await db.insert(capabilityForecasts).values({
        capabilityKey: f.capabilityKey,
        adapterType: f.adapterType,
        forecastType: f.forecastType,
        severity: f.severity,
        probability: f.probability,
        horizonDays: f.horizonDays,
        triggerCondition: f.triggerCondition,
        currentValue: f.currentValue,
        thresholdValue: f.thresholdValue,
        rationale: f.rationale,
        recommendedAction: f.recommendedAction,
        isAdminOnly: f.isAdminOnly,
      });
    }
  } catch (_err) {
    // fail-open
  }

  return forecasts;
}

export async function getForecasts(capabilityKey: string, adminOnly = false): Promise<(typeof capabilityForecasts.$inferSelect)[]> {
  try {
    const conditions = adminOnly
      ? eq(capabilityForecasts.capabilityKey, capabilityKey)
      : and(
          eq(capabilityForecasts.capabilityKey, capabilityKey),
          eq(capabilityForecasts.isAdminOnly, false),
        );
    return await db
      .select()
      .from(capabilityForecasts)
      .where(conditions)
      .orderBy(desc(capabilityForecasts.createdAt))
      .limit(20);
  } catch {
    return [];
  }
}

export type { ForecastInput };
