import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { businessesTable } from "./businesses";

// ─── Governance Audit Trail (Business Intelligence Phase A) ───────────────
// Platform-wide, append-only log of DATA CHANGES to governed records.
// Distinct from `business_timeline_events`, which narrates BUSINESS EVENTS
// ("a conflict was found", "health was recomputed") for a human/AI
// audience — the audit trail exists for compliance/security traceability:
// "who or what changed this row, and exactly what changed." Keyed
// generically by (recordTable, recordId) rather than nested under Business
// Intelligence specifically, so Phase B subsystems can write to this SAME
// table without a schema change or a rename.
//
// Scope for Phase A: mutations only (create/update/delete). Reads are
// deliberately NOT logged here — this is a data-change ledger, not an
// access log; logging every read would flood the table with no
// compliance value. Bookkeeping-only writes that touch nothing but a
// cache/freshness column (e.g. `lastAccessedAt` touches) are also excluded
// by convention — see the Data Access Layer's `touchAccessTimestamp`
// helper, which is deliberately exempt from audit writes.
export const AUDIT_ACTIONS = ["create", "update", "delete"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTOR_TYPES = ["user", "system", "ai", "scheduler"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const auditTrailEntriesTable = pgTable(
  "audit_trail_entries",
  {
    id: serial("id").primaryKey(),
    // Owner of the RECORD being changed (not necessarily the actor). Nullable
    // for the same one-step-migration reason as every other governed table's
    // ownerUserId — see governance.ts.
    ownerUserId: integer("owner_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
    recordTable: text("record_table").notNull(),
    recordId: integer("record_id").notNull(),
    action: text("action").notNull(),
    sourceEngine: text("source_engine").notNull(),
    actorType: text("actor_type").notNull().default("system"),
    // Who/what CAUSED the change. Null for pure system/scheduler actions
    // with no human in the loop, mirroring created_by/updated_by nullability
    // on every other governed table.
    actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    // Field-level before/after diff, e.g. { field: { before, after } }.
    changes: jsonb("changes").notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_trail_entries_owner_user_id_idx").on(t.ownerUserId),
    index("audit_trail_entries_business_id_idx").on(t.businessId),
    index("audit_trail_entries_record_table_id_idx").on(t.recordTable, t.recordId),
    index("audit_trail_entries_occurred_at_idx").on(t.occurredAt),
  ],
);

export const insertAuditTrailEntrySchema = createInsertSchema(auditTrailEntriesTable).omit({
  id: true,
  occurredAt: true,
});
export type InsertAuditTrailEntry = z.infer<typeof insertAuditTrailEntrySchema>;
export type AuditTrailEntry = typeof auditTrailEntriesTable.$inferSelect;
