import { pgTable, serial, integer, text, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";
import { ashProjectsTable } from "./executive_brain";

// ─── ASH Brain v2.0 — Business Intelligence Engine (Phase 1.5A) ────────────
// These tables are intentionally additive. `businesses` remains the root
// entity, while this module stores evidence-backed, versioned intelligence
// about it without changing existing business/health/recommendation flows.

export const BUSINESS_DNA_TRUST_LEVELS = [
  "user_confirmed",
  "verified_system_data",
  "high_confidence_inference",
  "low_confidence_inference",
] as const;
export type BusinessDnaTrustLevel = (typeof BUSINESS_DNA_TRUST_LEVELS)[number];

export const BUSINESS_CONFLICT_STATUSES = ["open", "resolved", "deferred"] as const;
export type BusinessConflictStatus = (typeof BUSINESS_CONFLICT_STATUSES)[number];

export const BUSINESS_REVIEW_STATUSES = ["open", "dismissed", "resolved"] as const;
export type BusinessReviewStatus = (typeof BUSINESS_REVIEW_STATUSES)[number];

export const BUSINESS_EVENT_STATUSES = ["pending", "processed", "failed"] as const;
export type BusinessEventStatus = (typeof BUSINESS_EVENT_STATUSES)[number];

export const businessDnaClaimsTable = pgTable(
  "business_dna_claims",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    currentValue: jsonb("current_value").notNull(),
    confidenceScore: integer("confidence_score").notNull().default(50),
    trustLevel: text("trust_level").notNull().default("low_confidence_inference"),
    source: text("source").notNull(),
    reasoning: text("reasoning"),
    version: integer("version").notNull().default(1),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("business_dna_claims_business_field_idx").on(t.businessId, t.fieldKey),
    index("business_dna_claims_business_id_idx").on(t.businessId),
  ],
);

// Immutable change/evidence log. Every accepted change, reinforcement, and
// unresolved conflicting discovery gets a record here; the current claim is
// only a fast read model of this history.
export const businessDnaVersionsTable = pgTable(
  "business_dna_versions",
  {
    id: serial("id").primaryKey(),
    claimId: integer("claim_id").notNull().references(() => businessDnaClaimsTable.id, { onDelete: "cascade" }),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    value: jsonb("value").notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    trustLevel: text("trust_level").notNull(),
    source: text("source").notNull(),
    reasoning: text("reasoning"),
    changeType: text("change_type").notNull(), // initialized | promoted | reinforced | conflict_observed | user_decision
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_dna_versions_claim_id_idx").on(t.claimId),
    index("business_dna_versions_business_id_idx").on(t.businessId),
  ],
);

export const businessDnaConflictsTable = pgTable(
  "business_dna_conflicts",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    claimId: integer("claim_id").notNull().references(() => businessDnaClaimsTable.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    currentValue: jsonb("current_value").notNull(),
    incomingValue: jsonb("incoming_value").notNull(),
    currentTrustLevel: text("current_trust_level").notNull(),
    incomingTrustLevel: text("incoming_trust_level").notNull(),
    incomingConfidenceScore: integer("incoming_confidence_score").notNull(),
    incomingSource: text("incoming_source").notNull(),
    incomingReasoning: text("incoming_reasoning"),
    impactScore: integer("impact_score").notNull().default(20),
    impactReason: text("impact_reason").notNull(),
    status: text("status").notNull().default("open"),
    resolvedByUserId: integer("resolved_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_dna_conflicts_business_status_idx").on(t.businessId, t.status),
    index("business_dna_conflicts_claim_id_idx").on(t.claimId),
  ],
);

export const businessReviewQueueTable = pgTable(
  "business_review_queue",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    conflictId: integer("conflict_id").references(() => businessDnaConflictsTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // conflict | stale_information | confirmation | confidence_upgrade
    priority: integer("priority").notNull().default(50),
    title: text("title").notNull(),
    description: text("description").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("business_review_queue_business_status_idx").on(t.businessId, t.status),
    index("business_review_queue_conflict_id_idx").on(t.conflictId),
  ],
);

export const businessTimelineEventsTable = pgTable(
  "business_timeline_events",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").references(() => ashProjectsTable.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    description: text("description").notNull(),
    trigger: text("trigger").notNull(),
    relatedObjects: jsonb("related_objects").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_timeline_events_business_occurred_idx").on(t.businessId, t.occurredAt),
    index("business_timeline_events_project_id_idx").on(t.projectId),
  ],
);

// Database-backed outbox. The initial runtime processes events immediately but
// stores them durably so a future broker can take over without changing event
// publishers or consumers.
export const businessDomainEventsTable = pgTable(
  "business_domain_events",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").references(() => ashProjectsTable.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    payload: jsonb("payload").notNull().default({}),
    dedupeKey: text("dedupe_key").notNull(),
    status: text("status").notNull().default("pending"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("business_domain_events_dedupe_key_idx").on(t.dedupeKey),
    index("business_domain_events_business_status_idx").on(t.businessId, t.status),
  ],
);

export const insertBusinessDnaClaimSchema = createInsertSchema(businessDnaClaimsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBusinessDnaVersionSchema = createInsertSchema(businessDnaVersionsTable).omit({ id: true, createdAt: true });
export const insertBusinessDnaConflictSchema = createInsertSchema(businessDnaConflictsTable).omit({ id: true, createdAt: true });
export const insertBusinessReviewQueueSchema = createInsertSchema(businessReviewQueueTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBusinessTimelineEventSchema = createInsertSchema(businessTimelineEventsTable).omit({ id: true, createdAt: true });
export const insertBusinessDomainEventSchema = createInsertSchema(businessDomainEventsTable).omit({ id: true, createdAt: true });

export type BusinessDnaClaim = typeof businessDnaClaimsTable.$inferSelect;
export type BusinessDnaVersion = typeof businessDnaVersionsTable.$inferSelect;
export type BusinessDnaConflict = typeof businessDnaConflictsTable.$inferSelect;
export type BusinessReviewQueueItem = typeof businessReviewQueueTable.$inferSelect;
export type BusinessTimelineEvent = typeof businessTimelineEventsTable.$inferSelect;
export type BusinessDomainEvent = typeof businessDomainEventsTable.$inferSelect;