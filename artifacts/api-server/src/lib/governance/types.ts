import type { AuditAction, AuditActorType } from "@workspace/db";

// ─── Data Access Layer — shared types (Business Intelligence Phase A) ─────
// Every governed write (DNA, Memory, Knowledge, Recommendations, Health,
// Timeline, Events, Conflicts, Review Queue) goes through a function in
// `lib/governance/writes/*` that requires one of these contexts, so
// ownership + audit metadata is never left to an individual call site to
// remember (or forget) to set.

// Who/what is causing a write. "user" = a human acting through an
// authenticated route (actorUserId is that user). "ai" = an LLM inference
// call produced the value (e.g. DNA field inference). "system" = derived
// deterministically from existing records (e.g. DNA import from business
// records, event-driven initialization). "scheduler" = a periodic/background
// sweep (e.g. memory maintenance, scheduled health recompute).
export interface GovernedActor {
  actorType: AuditActorType;
  actorUserId?: number | null;
}

export interface GovernedWriteContext {
  // RECORD owner (whose data this is) — not necessarily the actor. Almost
  // always a business's ownerId, denormalized so every governed table can be
  // scope-checked without a join.
  ownerUserId: number;
  // Dot-namespaced origin, e.g. "business_intelligence.dna" — lets the audit
  // trail be filtered per sub-engine without a separate column enum that
  // would need a migration every time a new engine is added.
  sourceEngine: string;
  actor: GovernedActor;
  // Denormalized onto every audit_trail_entries row so audit queries never
  // need to join back through the record table to scope by business.
  businessId?: number | null;
}

export function actorFor(actorType: AuditActorType, actorUserId?: number | null): GovernedActor {
  return { actorType, actorUserId: actorUserId ?? null };
}

export type { AuditAction, AuditActorType };
