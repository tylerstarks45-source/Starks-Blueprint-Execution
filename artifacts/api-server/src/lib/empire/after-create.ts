import type { Business } from "@workspace/db";
import { enqueue } from "../runtime/jobs";
import { logger } from "../logger";
import { initializeBusinessDna, publishBusinessEvent } from "../business-intelligence";

/** Non-blocking follow-up work for a newly created business (health pass, DNA, timeline). */
export function afterBusinessCreated(row: Pick<Business, "id" | "name">, userId: number): void {
  enqueue("business_health_analysis", { businessId: row.id, userId }, { priority: 5 }).catch((err) => {
    logger.warn({ err, businessId: row.id }, "Failed to enqueue initial business health analysis (non-fatal)");
  });
  initializeBusinessDna(row.id).catch((err) => logger.warn({ err, businessId: row.id }, "Business Intelligence: DNA initialization failed (non-fatal)"));
  publishBusinessEvent({
    businessId: row.id,
    eventType: "business.created",
    source: "businesses_route",
    payload: { description: `Business "${row.name}" was created.`, relatedObjects: { businessId: row.id } },
    dedupeKey: `business.created:${row.id}`,
  }).catch((err) => logger.warn({ err, businessId: row.id }, "Business Intelligence: timeline event failed (non-fatal)"));
}
