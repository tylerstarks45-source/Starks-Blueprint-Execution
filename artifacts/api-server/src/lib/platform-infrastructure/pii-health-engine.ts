import { db } from "@workspace/db";
import { resourceHealth, platformInfrastructureRegistry } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ResourceObservation } from "./types";

export async function persistResourceHealth(obs: ResourceObservation, triggeredBy = "scan"): Promise<void> {
  try {
    await db.insert(resourceHealth).values({
      resourceKey: obs.resourceKey,
      resourceType: obs.resourceType,
      status: obs.health,
      utilizationPercent: obs.utilizationPercent,
      pressureLevel: obs.pressureLevel,
      latencyMs: obs.latencyMs,
      errorRate: obs.errorRate,
      triggeredBy,
      diagnostics: obs.diagnostics,
    });
  } catch (_err) {
    // fail-open
  }
}

export async function upsertInfraRegistry(obs: ResourceObservation): Promise<void> {
  try {
    const existing = await db
      .select({ id: platformInfrastructureRegistry.id })
      .from(platformInfrastructureRegistry)
      .where(eq(platformInfrastructureRegistry.resourceKey, obs.resourceKey))
      .limit(1);

    if (existing.length > 0) {
      await db.update(platformInfrastructureRegistry).set({
        resourceType: obs.resourceType,
        resourceName: obs.resourceName,
        currentHealth: obs.health,
        currentUtilizationPercent: obs.utilizationPercent,
        totalCapacity: obs.totalCapacity,
        usedCapacity: obs.usedCapacity,
        availableCapacity: obs.availableCapacity,
        capacityUnit: obs.capacityUnit,
        pressureLevel: obs.pressureLevel,
        lastScannedAt: new Date(),
        lastHealthAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(platformInfrastructureRegistry.resourceKey, obs.resourceKey));
    } else {
      await db.insert(platformInfrastructureRegistry).values({
        resourceKey: obs.resourceKey,
        resourceType: obs.resourceType,
        resourceName: obs.resourceName,
        currentHealth: obs.health,
        currentUtilizationPercent: obs.utilizationPercent,
        totalCapacity: obs.totalCapacity,
        usedCapacity: obs.usedCapacity,
        availableCapacity: obs.availableCapacity,
        capacityUnit: obs.capacityUnit,
        pressureLevel: obs.pressureLevel,
        lastScannedAt: new Date(),
        lastHealthAt: new Date(),
      });
    }
  } catch (_err) {
    // fail-open
  }
}

export async function getHealthHistory(resourceKey: string, limit = 20): Promise<(typeof resourceHealth.$inferSelect)[]> {
  try {
    return await db.select().from(resourceHealth)
      .where(eq(resourceHealth.resourceKey, resourceKey))
      .orderBy(desc(resourceHealth.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export async function getAllHealthSummary(): Promise<(typeof platformInfrastructureRegistry.$inferSelect)[]> {
  try {
    return await db.select().from(platformInfrastructureRegistry)
      .orderBy(platformInfrastructureRegistry.resourceKey);
  } catch {
    return [];
  }
}
