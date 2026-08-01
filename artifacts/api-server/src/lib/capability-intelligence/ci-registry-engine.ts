import { db } from "@workspace/db";
import { ciCapabilityRegistry } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { CapabilityHealthStatus } from "./types";

export async function upsertRegistry(
  capabilityKey: string,
  adapterType: string,
  adapterIds: string[],
  health: CapabilityHealthStatus,
  confidence: number,
  successRate: number,
  avgLatencyMs: number,
  totalExecutions: number,
  totalFailures: number,
): Promise<void> {
  const readiness = health === "healthy" || health === "warning" ? "ready" :
    health === "degraded" ? "limited" :
    health === "critical" ? "at_risk" : "unavailable";

  try {
    const existing = await db
      .select({ id: ciCapabilityRegistry.id })
      .from(ciCapabilityRegistry)
      .where(eq(ciCapabilityRegistry.capabilityKey, capabilityKey))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(ciCapabilityRegistry)
        .set({
          adapterType,
          adapterIds,
          currentHealth: health,
          currentReadiness: readiness,
          overallConfidence: confidence,
          successRate,
          avgLatencyMs,
          totalExecutions,
          totalFailures,
          lastEvaluatedAt: new Date(),
          lastHealthAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ciCapabilityRegistry.capabilityKey, capabilityKey));
    } else {
      await db.insert(ciCapabilityRegistry).values({
        capabilityKey,
        adapterType,
        adapterIds,
        currentHealth: health,
        currentReadiness: readiness,
        overallConfidence: confidence,
        successRate,
        avgLatencyMs,
        totalExecutions,
        totalFailures,
        lastEvaluatedAt: new Date(),
        lastHealthAt: new Date(),
      });
    }
  } catch (_err) {
    // fail-open
  }
}

export async function getRegistry(): Promise<(typeof ciCapabilityRegistry.$inferSelect)[]> {
  try {
    return await db.select().from(ciCapabilityRegistry).orderBy(ciCapabilityRegistry.capabilityKey);
  } catch {
    return [];
  }
}

export async function getRegistryEntry(capabilityKey: string): Promise<typeof ciCapabilityRegistry.$inferSelect | null> {
  try {
    const rows = await db
      .select()
      .from(ciCapabilityRegistry)
      .where(eq(ciCapabilityRegistry.capabilityKey, capabilityKey))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
