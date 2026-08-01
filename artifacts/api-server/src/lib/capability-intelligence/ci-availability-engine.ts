import { db } from "@workspace/db";
import { capabilityAvailability } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CapabilityAvailabilityResult, ConnectivityStatus } from "./types";

function classifyServiceLevel(uptimePercent: number): string {
  if (uptimePercent >= 99.9) return "standard";
  if (uptimePercent >= 99.0) return "degraded";
  if (uptimePercent >= 95.0) return "minimal";
  return "none";
}

function classifyConnectivity(uptimePercent: number, successRate: number): ConnectivityStatus {
  if (uptimePercent >= 99.0 && successRate >= 0.9) return "connected";
  if (uptimePercent >= 90.0 || successRate >= 0.7) return "degraded";
  return "disconnected";
}

export async function trackAvailability(
  capabilityKey: string,
  adapterType: string,
  totalMinutesInWindow: number,
  downtimeMinutes: number,
  interruptionCount: number,
  successRate: number,
  windowDays = 30,
  hasScheduledMaintenance = false,
  maintenanceWindowStart?: Date,
  maintenanceWindowEnd?: Date,
): Promise<CapabilityAvailabilityResult> {
  const uptimePercent = totalMinutesInWindow > 0
    ? ((totalMinutesInWindow - downtimeMinutes) / totalMinutesInWindow) * 100
    : 100;

  const connectivityStatus = classifyConnectivity(uptimePercent, successRate);
  const serviceLevel = classifyServiceLevel(uptimePercent);

  try {
    await db.insert(capabilityAvailability).values({
      capabilityKey,
      adapterType,
      windowDays,
      uptimePercent,
      downtimeMinutes,
      interruptionCount,
      connectivityStatus,
      serviceLevel,
      hasScheduledMaintenance,
      maintenanceWindowStart,
      maintenanceWindowEnd,
    });
  } catch (_err) {
    // fail-open
  }

  return {
    capabilityKey, adapterType, uptimePercent, downtimeMinutes,
    connectivityStatus, interruptionCount, serviceLevel, hasScheduledMaintenance,
  };
}

export async function getLatestAvailability(capabilityKey: string): Promise<typeof capabilityAvailability.$inferSelect | null> {
  try {
    const rows = await db
      .select()
      .from(capabilityAvailability)
      .where(eq(capabilityAvailability.capabilityKey, capabilityKey))
      .orderBy(desc(capabilityAvailability.createdAt))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
