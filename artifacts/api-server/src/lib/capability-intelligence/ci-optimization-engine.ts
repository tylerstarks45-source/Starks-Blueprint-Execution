import { db } from "@workspace/db";
import { capabilityOptimizations } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type {
  CapabilityOptimizationResult,
  OptimizationType,
  AdminRecommendationCategory,
  RiskLevel,
  CapabilityHealthStatus,
} from "./types";

interface OptimizationInput {
  health: CapabilityHealthStatus;
  successRate: number;
  avgLatencyMs: number;
  errorRate: number;
  interruptionCount: number;
  adapterIsLatest: boolean;
  hasDeprecatedDependency: boolean;
}

function buildOptimizations(
  capabilityKey: string,
  adapterType: string,
  input: OptimizationInput,
): CapabilityOptimizationResult[] {
  const results: CapabilityOptimizationResult[] = [];

  // Upgrade adapter recommendation
  if (!input.adapterIsLatest) {
    results.push({
      capabilityKey, adapterType,
      optimizationType: "upgrade_adapter",
      priority: "medium",
      title: "Upgrade adapter to latest version",
      description: "A newer version of this adapter is available and may resolve known issues.",
      expectedImpact: "Bug fixes, improved compatibility, potential latency improvements",
      effort: "low",
      isAdminRecommendation: false,
    });
  }

  // Enable caching — latency reduction
  if (input.avgLatencyMs > 1000) {
    results.push({
      capabilityKey, adapterType,
      optimizationType: "enable_caching",
      priority: input.avgLatencyMs > 3000 ? "high" : "medium",
      title: "Enable response caching for this capability",
      description: `Average latency is ${input.avgLatencyMs.toFixed(0)}ms. Caching eligible responses could reduce load.`,
      expectedImpact: "30–70% latency reduction for cacheable operations",
      effort: "medium",
      isAdminRecommendation: false,
    });
  }

  // Reduce request volume — high error rate
  if (input.errorRate > 0.10) {
    results.push({
      capabilityKey, adapterType,
      optimizationType: "reduce_volume",
      priority: input.errorRate > 0.25 ? "high" : "medium",
      title: "Reduce execution volume or add backoff",
      description: `Error rate ${(input.errorRate * 100).toFixed(1)}% suggests potential rate limiting or capacity issues.`,
      expectedImpact: "Lower error rate, improved success reliability",
      effort: "low",
      isAdminRecommendation: false,
    });
  }

  // Replace deprecated dependency
  if (input.hasDeprecatedDependency) {
    results.push({
      capabilityKey, adapterType,
      optimizationType: "replace_deprecated",
      priority: "high",
      title: "Replace deprecated API dependency",
      description: "This capability depends on a deprecated API or service that may stop working.",
      expectedImpact: "Prevents future capability failure when deprecated API is removed",
      effort: "high",
      isAdminRecommendation: false,
    });
  }

  // Admin: Credential rotation
  if (input.errorRate > 0.05 && input.health !== "healthy") {
    results.push({
      capabilityKey, adapterType,
      optimizationType: "rotate_credentials",
      priority: "medium",
      title: "Rotate adapter credentials",
      description: "Credential rotation is recommended for adapters showing degraded health.",
      expectedImpact: "Resolves authentication-related errors, improves reliability",
      effort: "low",
      isAdminRecommendation: true,
      adminCategory: "credential" as AdminRecommendationCategory,
    });
  }

  // Admin: Quota increase
  if (input.errorRate > 0.15) {
    results.push({
      capabilityKey, adapterType,
      optimizationType: "increase_quota",
      priority: "high" as RiskLevel,
      title: "Increase API quota allocation",
      description: `Error rate ${(input.errorRate * 100).toFixed(1)}% may indicate quota exhaustion.`,
      expectedImpact: "Eliminate quota-related failures, restore full capability",
      effort: "low",
      isAdminRecommendation: true,
      adminCategory: "quota" as AdminRecommendationCategory,
    });
  }

  return results;
}

export async function produceOptimizations(
  capabilityKey: string,
  adapterType: string,
  input: OptimizationInput,
): Promise<CapabilityOptimizationResult[]> {
  const optimizations = buildOptimizations(capabilityKey, adapterType, input);

  try {
    for (const o of optimizations) {
      await db.insert(capabilityOptimizations).values({
        capabilityKey: o.capabilityKey,
        adapterType: o.adapterType,
        optimizationType: o.optimizationType,
        priority: o.priority,
        title: o.title,
        description: o.description,
        expectedImpact: o.expectedImpact,
        effort: o.effort,
        isAdminRecommendation: o.isAdminRecommendation,
        adminCategory: o.adminCategory,
      });
    }
  } catch (_err) {
    // fail-open
  }

  return optimizations;
}

export async function getOptimizations(
  capabilityKey: string,
  includeAdmin = false,
): Promise<(typeof capabilityOptimizations.$inferSelect)[]> {
  try {
    const rows = await db
      .select()
      .from(capabilityOptimizations)
      .where(eq(capabilityOptimizations.capabilityKey, capabilityKey))
      .orderBy(desc(capabilityOptimizations.generatedAt))
      .limit(20);

    return includeAdmin ? rows : rows.filter(r => !r.isAdminRecommendation);
  } catch {
    return [];
  }
}

export async function getAllOptimizations(includeAdmin = false): Promise<(typeof capabilityOptimizations.$inferSelect)[]> {
  try {
    const rows = await db
      .select()
      .from(capabilityOptimizations)
      .where(eq(capabilityOptimizations.isApplied, false))
      .orderBy(desc(capabilityOptimizations.generatedAt))
      .limit(100);
    return includeAdmin ? rows : rows.filter(r => !r.isAdminRecommendation);
  } catch {
    return [];
  }
}
