import { eq, isNull, and } from "drizzle-orm";
import { db, businessesTable, systemInstancesTable, type SystemInstance } from "@workspace/db";
import { logger } from "./logger";
import { enqueue } from "./runtime/jobs";
import { initializeBusinessDna, publishBusinessEvent } from "./business-intelligence";

// Best-effort: kick off an ASH health analysis pass for a freshly created
// business. Never blocks or fails the caller — this is fire-and-forget.
async function triggerHealthAnalysis(businessId: number, userId: number): Promise<void> {
  try {
    await enqueue("business_health_analysis", { businessId, userId }, { priority: 5 });
  } catch (err) {
    logger.warn({ err, businessId }, "Failed to enqueue initial business health analysis (non-fatal)");
  }
}

// A "business" is the new top-level container. ASH-built systems
// (system_instances) are surfaced in the Business Portfolio as origin="built"
// businesses that wrap the underlying system instance. These helpers keep the
// businesses table in sync with system_instances so built + imported businesses
// show up side by side.

function businessValuesForSystem(si: Pick<SystemInstance, "id" | "userId" | "name" | "clientWorkspaceId">) {
  return {
    ownerId: si.userId,
    name: si.name,
    businessType: "custom" as const,
    origin: "built" as const,
    status: "active" as const,
    systemInstanceId: si.id,
    ...(si.clientWorkspaceId !== null ? { clientWorkspaceId: si.clientWorkspaceId } : {}),
  };
}

// Idempotent: create a "built" business wrapper for every system instance that
// does not already have one. Safe to run on every startup.
export async function backfillBuiltBusinesses(): Promise<void> {
  try {
    const orphans = await db
      .select({
        id: systemInstancesTable.id,
        userId: systemInstancesTable.userId,
        name: systemInstancesTable.name,
        clientWorkspaceId: systemInstancesTable.clientWorkspaceId,
      })
      .from(systemInstancesTable)
      .leftJoin(
        businessesTable,
        and(
          eq(businessesTable.systemInstanceId, systemInstancesTable.id),
          eq(businessesTable.origin, "built"),
        ),
      )
      .where(isNull(businessesTable.id));

    if (orphans.length === 0) return;

    await db.insert(businessesTable).values(orphans.map(businessValuesForSystem));
    logger.info({ count: orphans.length }, "Backfilled built businesses for existing system instances");
  } catch (err) {
    logger.warn({ err }, "backfillBuiltBusinesses failed (non-fatal)");
  }
}

// Best-effort: create the "built" business wrapper for a freshly created system
// instance. Failures must never block system creation.
export async function ensureBuiltBusiness(
  si: Pick<SystemInstance, "id" | "userId" | "name" | "clientWorkspaceId">,
): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(and(eq(businessesTable.systemInstanceId, si.id), eq(businessesTable.origin, "built")));
    if (existing) return;

    const [created] = await db.insert(businessesTable).values(businessValuesForSystem(si)).returning({ id: businessesTable.id });
    if (created) {
      await triggerHealthAnalysis(created.id, si.userId);
      await initializeBusinessDna(created.id);
      await publishBusinessEvent({
        businessId: created.id,
        eventType: "business.created",
        source: "built_businesses",
        payload: { description: `ASH-built business wrapper was created for system instance ${si.id}.`, relatedObjects: { systemInstanceId: si.id } },
        dedupeKey: `built_business.created:${created.id}`,
      });
    }
  } catch (err) {
    logger.warn({ err, systemInstanceId: si.id }, "ensureBuiltBusiness failed (non-fatal)");
  }
}
