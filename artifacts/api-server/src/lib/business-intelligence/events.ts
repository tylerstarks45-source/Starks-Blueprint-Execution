import { db, businessDomainEventsTable, businessTimelineEventsTable, type BusinessDomainEvent } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { insertDomainEvent, insertTimelineEvent, markDomainEventProcessed } from "../governance/writes/events-writes";
import { resolveBusinessOwnerUserId } from "../governance/ownership";
import { actorFor, type GovernedWriteContext } from "../governance/types";

export interface PublishBusinessEventInput {
  businessId: number;
  projectId?: number | null;
  eventType: string;
  source: string;
  payload?: Record<string, unknown>;
  dedupeKey: string;
}

// Structural type lifted straight from drizzle's own transaction callback, so
// this module never has to import drizzle-orm's transaction generics
// directly — any `db.transaction(tx => ...)` callback's `tx` is assignable
// wherever a DbExecutor is expected.
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = typeof db | TransactionClient;

type BusinessEventHandler = (event: BusinessDomainEvent) => Promise<void>;

// ─── Business Event Bus (Phase 1.5A hardening) ─────────────────────────────
// Publishers and subscribers only ever depend on this interface, never on
// the outbox table directly, so a future queue/broker can implement the same
// contract without touching a single call site. Today's implementation is a
// Postgres-backed outbox: durable, transactional (publishTx participates in
// the caller's transaction), and deduplicated by key.
export interface BusinessEventBus {
  publish(input: PublishBusinessEventInput): Promise<void>;
  // Inserts the event as part of an in-flight transaction and returns its id,
  // or null if it was a no-op duplicate. Does NOT run subscribers/timeline —
  // call processBusinessEvent(id) after the transaction commits, so
  // subscriber/timeline side effects never observe a write that later rolls back.
  publishTx(tx: DbExecutor, input: PublishBusinessEventInput): Promise<number | null>;
  subscribe(eventTypes: string[], handler: BusinessEventHandler): void;
}

const subscribers = new Map<string, BusinessEventHandler[]>();

// Modules register their own reactions instead of this file hardcoding a
// dynamic-import if-chain per event type (the old pattern). Registration
// order does not matter: every matching handler runs independently via
// Promise.allSettled, so one handler's failure never blocks another or blocks
// timeline recording.
export function registerBusinessEventSubscriber(eventTypes: string[], handler: BusinessEventHandler): void {
  for (const eventType of eventTypes) {
    const list = subscribers.get(eventType) ?? [];
    list.push(handler);
    subscribers.set(eventType, list);
  }
}

class DatabaseOutboxEventBus implements BusinessEventBus {
  async publish(input: PublishBusinessEventInput): Promise<void> {
    const eventId = await this.publishTx(db, input);
    if (eventId != null) await processBusinessEvent(eventId);
  }

  async publishTx(tx: DbExecutor, input: PublishBusinessEventInput): Promise<number | null> {
    // Domain events are system-generated records OF a fact, even when that
    // fact originated from a user action upstream (the route already
    // governs its own direct writes with the real actor) — so the event
    // record itself is always stamped as a "system" write. Resolving
    // ownership from input.businessId here (rather than requiring every one
    // of publishBusinessEvent's many external callers to pass a governance
    // context) keeps this a drop-in, signature-compatible upgrade.
    const ctx = await eventGovernanceContext(tx, input.businessId, input.source);
    const event = await insertDomainEvent(tx, ctx, {
      businessId: input.businessId,
      projectId: input.projectId ?? null,
      eventType: input.eventType,
      source: input.source,
      payload: input.payload ?? {},
      dedupeKey: input.dedupeKey,
    });
    return event?.id ?? null;
  }

  subscribe(eventTypes: string[], handler: BusinessEventHandler): void {
    registerBusinessEventSubscriber(eventTypes, handler);
  }
}

// Shared by publishTx and recordTimelineForEvent — see the comment on
// publishTx for why this resolves ownership internally instead of widening
// the public publish/publishTx signatures.
async function eventGovernanceContext(tx: DbExecutor, businessId: number, source: string): Promise<GovernedWriteContext> {
  const ownerUserId = await resolveBusinessOwnerUserId(tx, businessId);
  return {
    ownerUserId,
    sourceEngine: "business_intelligence.events",
    actor: actorFor(source === "ai_inference" ? "ai" : "system"),
    businessId,
  };
}

export const businessEventBus: BusinessEventBus = new DatabaseOutboxEventBus();

// Convenience free functions — most call sites don't need the bus instance.
export async function publishBusinessEvent(input: PublishBusinessEventInput): Promise<void> {
  return businessEventBus.publish(input);
}

export async function publishBusinessEventTx(tx: DbExecutor, input: PublishBusinessEventInput): Promise<number | null> {
  return businessEventBus.publishTx(tx, input);
}

// Runs the post-commit side effects for a durably-stored event: timeline
// recording (always, via this single shared boundary — no subsystem should
// write timeline rows ad hoc) and every registered subscriber. A subscriber
// throwing never blocks timeline recording, and never blocks other
// subscribers; failures are logged and reflected in the event's status.
export async function processBusinessEvent(eventId: number): Promise<void> {
  const [event] = await db.select().from(businessDomainEventsTable).where(eq(businessDomainEventsTable.id, eventId));
  if (!event) return;

  let timelineError: unknown = null;
  try {
    await recordTimelineForEvent(event);
  } catch (err) {
    timelineError = err;
    logger.warn({ err, eventId, eventType: event.eventType }, "Business Intelligence: timeline recording failed");
  }

  const handlers = subscribers.get(event.eventType) ?? [];
  const results = await Promise.allSettled(handlers.map((handler) => handler(event)));
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  for (const failure of failures) {
    logger.warn({ err: failure.reason, eventId, eventType: event.eventType }, "Business Intelligence: event subscriber failed");
  }

  const anyFailure = failures.length > 0 || timelineError != null;
  // Audit-exempt by design: this only flips the outbox's own delivery
  // status after an already-audited event runs its subscribers — see
  // markDomainEventProcessed's doc comment.
  await markDomainEventProcessed(db, event.id, {
    status: anyFailure ? "failed" : "processed",
    processedAt: new Date(),
    errorMessage: failures.length > 0 ? String(failures[0]!.reason).slice(0, 500) : null,
  }).catch(() => {});
}

async function recordTimelineForEvent(event: BusinessDomainEvent): Promise<void> {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const description = typeof payload.description === "string"
    ? payload.description
    : `${event.eventType.replaceAll(".", " ")} recorded by ${event.source}`;

  const ctx = await eventGovernanceContext(db, event.businessId, event.source);
  await insertTimelineEvent(db, ctx, {
    businessId: event.businessId,
    projectId: event.projectId,
    eventType: event.eventType,
    source: event.source,
    description,
    trigger: event.eventType,
    relatedObjects: payload.relatedObjects ?? {},
    occurredAt: event.createdAt,
  });
}
