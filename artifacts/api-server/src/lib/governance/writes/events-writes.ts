import { eq } from "drizzle-orm";
import {
  businessTimelineEventsTable,
  businessDomainEventsTable,
  type BusinessTimelineEvent,
  type BusinessDomainEvent,
} from "@workspace/db";
import type { DbExecutor } from "../../business-intelligence/events";
import type { GovernedWriteContext } from "../types";
import { recordAudit } from "../audit";
import { stampCreate, type GovernanceManagedKeys } from "./helpers";

// Unlike the DNA tables, `projectId` here is each table's own pre-existing
// domain column (the ASH project the event relates to), not the reserved
// governance projectScopeColumn() — so it stays caller-supplied.
export type NewTimelineEvent = Omit<typeof businessTimelineEventsTable.$inferInsert, GovernanceManagedKeys>;
export type NewDomainEvent = Omit<typeof businessDomainEventsTable.$inferInsert, GovernanceManagedKeys>;

// ─── business_timeline_events (Timeline sub-engine) ────────────────────────
// Append-only narration for a human/AI audience. Every insert is audited —
// a new timeline entry is always new information, never bookkeeping.
export async function insertTimelineEvent(tx: DbExecutor, ctx: GovernedWriteContext, values: NewTimelineEvent): Promise<BusinessTimelineEvent> {
  const [event] = await tx.insert(businessTimelineEventsTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_timeline_events", recordId: event!.id, action: "create", changes: { after: values } });
  return event!;
}

// ─── business_domain_events (Events sub-engine — outbox) ───────────────────
export async function insertDomainEvent(tx: DbExecutor, ctx: GovernedWriteContext, values: NewDomainEvent): Promise<BusinessDomainEvent | null> {
  const [event] = await tx
    .insert(businessDomainEventsTable)
    .values({ ...values, ...stampCreate(ctx) })
    .onConflictDoNothing()
    .returning();
  if (!event) return null; // deduped by dedupeKey — not a new record, nothing to audit
  await recordAudit(tx, ctx, { recordTable: "business_domain_events", recordId: event.id, action: "create", changes: { after: values } });
  return event;
}

// Deliberately audit-EXEMPT and outside the normal update wrapper: this only
// flips the outbox's own processing status/error after a domain event that
// was already audited at creation has run its subscribers. It is bookkeeping
// on the event's delivery lifecycle, not new information about the business,
// so it must not add audit-trail noise — mirrors the touchAccessTimestamp
// exemption used by Memory/Knowledge for lastAccessedAt bumps.
export async function markDomainEventProcessed(
  tx: DbExecutor,
  id: number,
  values: { status: "processed" | "failed"; processedAt: Date; errorMessage: string | null },
): Promise<void> {
  await tx.update(businessDomainEventsTable).set(values).where(eq(businessDomainEventsTable.id, id));
}
