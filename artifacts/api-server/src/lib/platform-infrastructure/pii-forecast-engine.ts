import { db } from "@workspace/db";
import { resourceForecasts } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CapacityAssessment, InfraForecastResult, PressureLevel } from "./types";

const HIGH_UTILIZATION_THRESHOLD = 80;
const CRITICAL_UTILIZATION_THRESHOLD = 90;
const EXHAUSTION_WARNING_DAYS = 30;
const EXHAUSTION_CRITICAL_DAYS = 7;

function riskSeverity(utilizationPercent: number, daysToExhaustion?: number): PressureLevel {
  if (daysToExhaustion !== undefined && daysToExhaustion <= EXHAUSTION_CRITICAL_DAYS) return "critical";
  if (daysToExhaustion !== undefined && daysToExhaustion <= EXHAUSTION_WARNING_DAYS) return "high";
  if (utilizationPercent >= CRITICAL_UTILIZATION_THRESHOLD) return "critical";
  if (utilizationPercent >= HIGH_UTILIZATION_THRESHOLD) return "high";
  if (utilizationPercent >= 65) return "medium";
  return "low";
}

export async function generateInfraForecasts(assessments: CapacityAssessment[]): Promise<InfraForecastResult[]> {
  const forecasts: InfraForecastResult[] = [];

  for (const a of assessments) {
    // Skip healthy resources with comfortable capacity
    if (a.utilizationPercent < 65 && (a.daysToExhaustion === undefined || a.daysToExhaustion > 60)) {
      continue;
    }

    const severity = riskSeverity(a.utilizationPercent, a.daysToExhaustion);
    const probability = Math.min(1, a.utilizationPercent / 100 * 1.2);
    const projectedUtilization = Math.min(100, a.utilizationPercent + a.growthRatePerDay * 30);

    let forecastType: InfraForecastResult["forecastType"] = "pressure";
    let triggerCondition = `Utilization at ${a.utilizationPercent.toFixed(1)}%`;
    let rationale = `Resource ${a.resourceKey} is at ${a.utilizationPercent.toFixed(1)}% utilization.`;
    let recommendedAction = "Monitor closely and plan capacity expansion.";

    if (a.daysToExhaustion !== undefined && a.daysToExhaustion <= EXHAUSTION_WARNING_DAYS) {
      forecastType = "exhaustion";
      triggerCondition = `At current growth rate, exhaustion in ${a.daysToExhaustion} days`;
      rationale = `At ${a.growthRatePerDay.toFixed(2)}% daily growth, ${a.resourceKey} will exhaust in approximately ${a.daysToExhaustion} days.`;
      recommendedAction = a.daysToExhaustion <= EXHAUSTION_CRITICAL_DAYS
        ? "Immediate capacity expansion required."
        : "Schedule capacity expansion within the next 2 weeks.";
    } else if (a.utilizationPercent >= CRITICAL_UTILIZATION_THRESHOLD) {
      forecastType = "degradation";
      triggerCondition = `Critical utilization: ${a.utilizationPercent.toFixed(1)}%`;
      rationale = `${a.resourceKey} is at critical utilization. Performance degradation is imminent.`;
      recommendedAction = "Reduce load immediately or provision additional capacity.";
    }

    const forecast: InfraForecastResult = {
      resourceKey: a.resourceKey,
      resourceType: a.resourceType,
      forecastType,
      severity,
      probability,
      horizonDays: a.daysToExhaustion ?? 30,
      currentUtilization: a.utilizationPercent,
      projectedUtilization,
      triggerCondition,
      rationale,
      recommendedAction,
      isAdminOnly: true,
    };

    forecasts.push(forecast);

    try {
      await db.insert(resourceForecasts).values({
        resourceKey: forecast.resourceKey,
        resourceType: forecast.resourceType,
        forecastType: forecast.forecastType,
        severity: forecast.severity,
        probability: forecast.probability,
        horizonDays: forecast.horizonDays,
        currentUtilization: forecast.currentUtilization,
        projectedUtilization: forecast.projectedUtilization,
        triggerCondition: forecast.triggerCondition,
        rationale: forecast.rationale,
        recommendedAction: forecast.recommendedAction,
        isAdminOnly: forecast.isAdminOnly,
      });
    } catch (_err) {
      // fail-open
    }
  }

  return forecasts;
}

export async function getForecasts(resourceKey?: string): Promise<(typeof resourceForecasts.$inferSelect)[]> {
  try {
    if (resourceKey) {
      return await db.select().from(resourceForecasts)
        .where(eq(resourceForecasts.resourceKey, resourceKey))
        .orderBy(desc(resourceForecasts.createdAt))
        .limit(20);
    }
    return await db.select().from(resourceForecasts)
      .orderBy(desc(resourceForecasts.createdAt))
      .limit(100);
  } catch {
    return [];
  }
}
