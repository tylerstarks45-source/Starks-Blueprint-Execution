// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Adapter Lifecycle Engine
// Install → Enable → Disable → Upgrade → Rollback → Health Check → Deprecate → Retire
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { executionAdapters, adapterVersions, adapterHealth, adapterRegistry } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { AdapterStatus, AdapterLifecycleEvent, AdapterHealthStatus } from "./types";

const logger = { warn: console.warn.bind(console) };

// Valid lifecycle transitions
const LIFECYCLE_TRANSITIONS: Record<AdapterStatus, AdapterStatus[]> = {
  pending:    ["enabled", "retired"],
  enabled:    ["disabled", "deprecated"],
  disabled:   ["enabled", "deprecated", "retired"],
  deprecated: ["retired"],
  retired:    [],
};

export interface LifecycleResult {
  adapterId: string;
  event: AdapterLifecycleEvent;
  previousStatus: AdapterStatus;
  newStatus: AdapterStatus;
  success: boolean;
  reason: string;
}

/**
 * Transition an adapter through a lifecycle event.
 */
export async function applyLifecycleEvent(
  adapterId: string,
  event: AdapterLifecycleEvent
): Promise<LifecycleResult> {
  try {
    const rows = await db
      .select()
      .from(executionAdapters)
      .where(eq(executionAdapters.id, adapterId))
      .limit(1);

    if (!rows[0]) {
      return { adapterId, event, previousStatus: "pending", newStatus: "pending", success: false, reason: "Adapter not found." };
    }

    const adapter = rows[0];
    const prev = adapter.status as AdapterStatus;

    const targetStatus = eventToStatus(event, prev);
    if (!targetStatus) {
      return { adapterId, event, previousStatus: prev, newStatus: prev, success: false, reason: `Event "${event}" is not valid from status "${prev}".` };
    }

    const allowed = LIFECYCLE_TRANSITIONS[prev] ?? [];
    if (!allowed.includes(targetStatus)) {
      return { adapterId, event, previousStatus: prev, newStatus: prev, success: false, reason: `Transition ${prev} → ${targetStatus} is not allowed.` };
    }

    await db
      .update(executionAdapters)
      .set({ status: targetStatus })
      .where(eq(executionAdapters.id, adapterId));

    return { adapterId, event, previousStatus: prev, newStatus: targetStatus, success: true, reason: `Lifecycle transition ${prev} → ${targetStatus} applied.` };
  } catch (err) {
    logger.warn({ err, adapterId, event }, "adapter-lifecycle-engine: transition failed");
    return { adapterId, event, previousStatus: "pending", newStatus: "pending", success: false, reason: String(err) };
  }
}

function eventToStatus(event: AdapterLifecycleEvent, current: AdapterStatus): AdapterStatus | null {
  switch (event) {
    case "install":     return "pending";
    case "enable":      return "enabled";
    case "disable":     return "disabled";
    case "deprecate":   return "deprecated";
    case "retire":      return "retired";
    case "upgrade":     return current;   // upgrade doesn't change status, just version
    case "rollback":    return current;   // rollback reverts version, not status
    case "health_check": return null;     // health_check is not a status transition
    default:            return null;
  }
}

/**
 * Run a health check for an adapter. Appends a health record.
 * Deterministic in the generic engine — always returns healthy.
 * Future adapters extend via EP_ADAPTER_HEALTH_CHECKED.
 */
export async function runHealthCheck(adapterId: string): Promise<AdapterHealthStatus> {
  try {
    const rows = await db
      .select()
      .from(executionAdapters)
      .where(eq(executionAdapters.id, adapterId))
      .limit(1);

    if (!rows[0]) {
      await persistHealthRecord(adapterId, "unknown", 0, "Adapter not found.");
      return "unknown";
    }

    const adapter = rows[0];
    const health: AdapterHealthStatus = adapter.status === "enabled" ? "healthy" : "degraded";
    const latencyMs = 1; // deterministic

    await persistHealthRecord(adapterId, health, latencyMs, "");

    // Update registry health
    await db
      .update(adapterRegistry)
      .set({ health, lastHealthCheckAt: new Date(), updatedAt: new Date() })
      .where(eq(adapterRegistry.adapterType, adapter.adapterType));

    return health;
  } catch (err) {
    logger.warn({ err, adapterId }, "adapter-lifecycle-engine: health check failed");
    return "unknown";
  }
}

async function persistHealthRecord(
  adapterId: string,
  healthStatus: AdapterHealthStatus,
  latencyMs: number,
  errorMessage: string
): Promise<void> {
  try {
    await db.insert(adapterHealth).values({
      id:           `health-${randomUUID()}`,
      adapterId,
      healthStatus,
      latencyMs,
      errorMessage,
      checkData:    { checkedAt: new Date().toISOString(), deterministic: true },
    });
  } catch (err) {
    logger.warn({ err, adapterId }, "adapter-lifecycle-engine: health record persist failed");
  }
}

/**
 * Upgrade an adapter version — appends a version record.
 */
export async function upgradeAdapterVersion(
  adapterId: string,
  newVersion: string,
  changelog: string
): Promise<void> {
  try {
    // Mark old versions as not current
    const existing = await db
      .select()
      .from(adapterVersions)
      .where(eq(adapterVersions.adapterId, adapterId));

    const currentVer = existing.find(v => v.isCurrent)?.version ?? "1.0.0";

    for (const v of existing.filter(v => v.isCurrent)) {
      await db
        .update(adapterVersions)
        .set({ isCurrent: false })
        .where(eq(adapterVersions.id, v.id));
    }

    await db.insert(adapterVersions).values({
      id:              `ver-${randomUUID()}`,
      adapterId,
      version:         newVersion,
      previousVersion: currentVer,
      changelog,
      isCurrent:       true,
    });

    await db
      .update(executionAdapters)
      .set({ version: newVersion })
      .where(eq(executionAdapters.id, adapterId));
  } catch (err) {
    logger.warn({ err, adapterId }, "adapter-lifecycle-engine: version upgrade failed");
  }
}
