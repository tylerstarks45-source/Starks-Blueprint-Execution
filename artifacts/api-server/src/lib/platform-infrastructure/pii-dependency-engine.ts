import { db } from "@workspace/db";
import { resourceDependencies } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { InfraHealthStatus } from "./types";

// Core platform dependency graph — static topology for deterministic cascade analysis.
// Real service mesh topology arrives via EP_PII_DEPENDENCY_MAPPED.
export const PLATFORM_DEPENDENCY_GRAPH: Array<{
  resourceKey: string;
  dependsOnKey: string;
  relationship: "requires" | "shares" | "chains" | "buffers";
  isRequired: boolean;
}> = [
  // Database is a shared dependency for almost everything
  { resourceKey: "execution_queue:main",      dependsOnKey: "database:postgres",      relationship: "requires", isRequired: true  },
  { resourceKey: "vector_db:pgvector",        dependsOnKey: "database:postgres",      relationship: "requires", isRequired: true  },
  { resourceKey: "model_provider:primary",    dependsOnKey: "network:egress",         relationship: "requires", isRequired: true  },
  { resourceKey: "api_quota:openrouter",      dependsOnKey: "model_provider:primary", relationship: "chains",   isRequired: true  },
  { resourceKey: "execution_throughput:main", dependsOnKey: "worker_pool:runtime",    relationship: "requires", isRequired: true  },
  { resourceKey: "execution_throughput:main", dependsOnKey: "execution_queue:main",   relationship: "buffers",  isRequired: true  },
  { resourceKey: "adapter_pool:general",      dependsOnKey: "worker_pool:runtime",    relationship: "shares",   isRequired: false },
  { resourceKey: "browser_pool:chromium",     dependsOnKey: "ram:system",             relationship: "requires", isRequired: false },
  { resourceKey: "cache:memory",              dependsOnKey: "ram:system",             relationship: "shares",   isRequired: false },
];

function cascadeRisk(depHealth: InfraHealthStatus, isRequired: boolean): string {
  if (!isRequired) return "low";
  switch (depHealth) {
    case "healthy": return "low";
    case "warning": return "medium";
    case "degraded": return "high";
    case "critical":
    case "unavailable": return "critical";
    default: return "low";
  }
}

export async function persistDependencies(
  healthMap: Map<string, InfraHealthStatus>,
): Promise<void> {
  for (const dep of PLATFORM_DEPENDENCY_GRAPH) {
    const depHealth = healthMap.get(dep.dependsOnKey) ?? "unknown";
    const risk = cascadeRisk(depHealth as InfraHealthStatus, dep.isRequired);

    // Shared consumers: find all resources that also depend on the same upstream
    const sharedConsumers = PLATFORM_DEPENDENCY_GRAPH
      .filter(d => d.dependsOnKey === dep.dependsOnKey && d.resourceKey !== dep.resourceKey)
      .map(d => d.resourceKey);

    try {
      await db.insert(resourceDependencies).values({
        resourceKey: dep.resourceKey,
        dependsOnKey: dep.dependsOnKey,
        dependencyType: dep.relationship,
        isRequired: dep.isRequired,
        dependencyHealth: depHealth,
        cascadeRisk: risk,
        sharedConsumers,
      });
    } catch (_err) {
      // fail-open
    }
  }
}

export async function getDependencies(resourceKey?: string): Promise<(typeof resourceDependencies.$inferSelect)[]> {
  try {
    if (resourceKey) {
      return await db.select().from(resourceDependencies)
        .where(eq(resourceDependencies.resourceKey, resourceKey))
        .orderBy(desc(resourceDependencies.createdAt))
        .limit(20);
    }
    return await db.select().from(resourceDependencies)
      .orderBy(desc(resourceDependencies.createdAt))
      .limit(200);
  } catch {
    return [];
  }
}
