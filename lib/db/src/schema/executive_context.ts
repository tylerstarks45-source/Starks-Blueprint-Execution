import {
  pgTable,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ─── Executive Context Engine (Build 006) ────────────────────────────────────
//
// The Executive Context Engine is the shared cognitive layer that gives every
// Brain situational awareness. It answers the question every decision-maker
// faces before reasoning: "What is the full context in which I am operating?"
//
// Four tables:
//   executive_contexts      — the rich context model (objectives, constraints, etc.)
//   context_snapshots       — immutable frozen snapshots taken before each reasoning cycle
//   context_timeline_events — full historical audit trail of every context change
//   context_entity_links    — extensible relationships from a context to any entity

// ── Context types ─────────────────────────────────────────────────────────────
export const EXECUTIVE_CONTEXT_TYPES = [
  "operational",   // Day-to-day running context
  "strategic",     // Long-horizon direction-setting context
  "tactical",      // Short-horizon execution context
  "exploratory",   // Discovery / research context
  "investigative", // Problem diagnosis context
] as const;
export type ExecutiveContextType = (typeof EXECUTIVE_CONTEXT_TYPES)[number];

// ── Context statuses ──────────────────────────────────────────────────────────
export const EXECUTIVE_CONTEXT_STATUSES = [
  "draft",    // Being built, not yet active
  "active",   // Currently governing reasoning
  "inactive", // Paused, can be reactivated
  "archived", // Closed, preserved for history
] as const;
export type ExecutiveContextStatus = (typeof EXECUTIVE_CONTEXT_STATUSES)[number];

// ── Timeline event types ──────────────────────────────────────────────────────
export const CONTEXT_TIMELINE_EVENT_TYPES = [
  "created",
  "updated",
  "priority_changed",
  "constraint_changed",
  "objective_changed",
  "relationship_changed",
  "activated",
  "deactivated",
  "version_changed",
  "archived",
] as const;
export type ContextTimelineEventType = (typeof CONTEXT_TIMELINE_EVENT_TYPES)[number];

// ── Context entity link types ─────────────────────────────────────────────────
export const CONTEXT_ENTITY_TYPES = [
  "project",
  "goal",
  "artifact",
  "cluster",
  "brain",
  "capability",
  "plan",
  "strategy",
  "decision",
  "execution",
] as const;
export type ContextEntityType = (typeof CONTEXT_ENTITY_TYPES)[number];

// ── executive_contexts ────────────────────────────────────────────────────────
// The full Executive Context model. Every Brain shares these contexts rather
// than maintaining its own siloed understanding of what is being pursued.
//
// All array fields (objectives, constraints, etc.) use JSONB string arrays.
// This keeps the schema stable as the complexity of each field grows — future
// builds can graduate individual fields to typed sub-tables without schema
// redesign of the outer model.
export const executiveContextsTable = pgTable(
  "executive_contexts",
  {
    // ── Identity ───────────────────────────────────────────────────────────
    id: text("id").primaryKey(),

    // ── Ownership ─────────────────────────────────────────────────────────
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Core model ────────────────────────────────────────────────────────
    name: text("name").notNull(),
    contextType: text("context_type").notNull().default("operational"),
    description: text("description"),
    purpose: text("purpose"),
    mission: text("mission"),
    scope: text("scope"),

    // ── Context dimensions (all string arrays, ordered where relevant) ────
    objectives: jsonb("objectives").notNull().default([]).$type<string[]>(),
    constraints: jsonb("constraints").notNull().default([]).$type<string[]>(),
    assumptions: jsonb("assumptions").notNull().default([]).$type<string[]>(),
    // priorities is ordered: index 0 = highest priority
    priorities: jsonb("priorities").notNull().default([]).$type<string[]>(),
    risks: jsonb("risks").notNull().default([]).$type<string[]>(),
    dependencies: jsonb("dependencies").notNull().default([]).$type<string[]>(),
    stakeholders: jsonb("stakeholders").notNull().default([]).$type<string[]>(),
    successCriteria: jsonb("success_criteria").notNull().default([]).$type<string[]>(),
    failureConditions: jsonb("failure_conditions").notNull().default([]).$type<string[]>(),

    // ── Lifecycle ─────────────────────────────────────────────────────────
    status: text("status").notNull().default("draft"),
    confidence: text("confidence").notNull().default("unknown"),
    // version increments on every structural change; enables future replay
    version: integer("version").notNull().default(1),

    // ── Forward-compatibility ─────────────────────────────────────────────
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("exec_contexts_user_id_idx").on(t.userId),
    index("exec_contexts_status_idx").on(t.status),
    index("exec_contexts_type_idx").on(t.contextType),
    // The most common query: all active contexts for a user
    index("exec_contexts_user_status_idx").on(t.userId, t.status),
    index("exec_contexts_created_at_idx").on(t.createdAt),
  ],
);

export const insertExecutiveContextSchema = createInsertSchema(executiveContextsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertExecutiveContext = z.infer<typeof insertExecutiveContextSchema>;
export type ExecutiveContextRow = typeof executiveContextsTable.$inferSelect;

// ── context_snapshots ─────────────────────────────────────────────────────────
// Immutable frozen snapshots of the resolved context state, taken once before
// each Executive Brain reasoning cycle. Every Decision Record references the
// snapshot that was active when it was made — enabling future replay, auditing,
// and learning without needing to reconstruct what was known at decision time.
//
// Snapshots are WRITE-ONCE: created_at only, no updated_at.
export const contextSnapshotsTable = pgTable(
  "context_snapshots",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    // IDs of executive_contexts that contributed to this snapshot
    contextIds: jsonb("context_ids").notNull().default([]).$type<string[]>(),
    // The objective text being pursued when this snapshot was taken
    objectiveText: text("objective_text"),

    // ── Resolved context dimensions (merged from all contributing contexts) ─
    activeObjectives: jsonb("active_objectives").notNull().default([]).$type<string[]>(),
    activeConstraints: jsonb("active_constraints").notNull().default([]).$type<string[]>(),
    activePriorities: jsonb("active_priorities").notNull().default([]).$type<string[]>(),
    activeRisks: jsonb("active_risks").notNull().default([]).$type<string[]>(),

    // ── Related cognitive artifacts (from Builds 004–005) ─────────────────
    relatedArtifactIds: jsonb("related_artifact_ids").notNull().default([]).$type<string[]>(),
    relatedClusterIds: jsonb("related_cluster_ids").notNull().default([]).$type<string[]>(),
    relatedBrainNames: jsonb("related_brain_names").notNull().default([]).$type<string[]>(),
    relatedCapabilityIds: jsonb("related_capability_ids").notNull().default([]).$type<string[]>(),

    // ── Resolution metadata ────────────────────────────────────────────────
    environmentalMetadata: jsonb("environmental_metadata").notNull().default({}).$type<Record<string, unknown>>(),
    // Any detected conflicts between contributing contexts
    conflictFlags: jsonb("conflict_flags").notNull().default([]).$type<string[]>(),
    resolutionStrategy: text("resolution_strategy"),

    // ── Write-once timestamp ───────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("context_snapshots_user_id_idx").on(t.userId),
    index("context_snapshots_created_at_idx").on(t.createdAt),
  ],
);

export const insertContextSnapshotSchema = createInsertSchema(contextSnapshotsTable).omit({
  createdAt: true,
});
export type InsertContextSnapshot = z.infer<typeof insertContextSnapshotSchema>;
export type ContextSnapshotRow = typeof contextSnapshotsTable.$inferSelect;

// ── context_timeline_events ───────────────────────────────────────────────────
// Every change to an Executive Context is recorded as an immutable timeline
// event. Nothing overwrites history. History must remain replayable.
export const contextTimelineEventsTable = pgTable(
  "context_timeline_events",
  {
    id: text("id").primaryKey(),
    contextId: text("context_id")
      .notNull()
      .references(() => executiveContextsTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    // Which field changed (null for lifecycle events like activated/archived)
    changedField: text("changed_field"),
    oldValue: jsonb("old_value").$type<unknown>(),
    newValue: jsonb("new_value").$type<unknown>(),
    reason: text("reason"),
    // Brain name, 'user', or 'system'
    triggeredBy: text("triggered_by").notNull().default("system"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("context_timeline_context_id_idx").on(t.contextId),
    index("context_timeline_event_type_idx").on(t.eventType),
    index("context_timeline_created_at_idx").on(t.createdAt),
    // For fast "show me all changes to this context" queries
    index("context_timeline_context_created_idx").on(t.contextId, t.createdAt),
  ],
);

export const insertContextTimelineEventSchema = createInsertSchema(contextTimelineEventsTable).omit({
  createdAt: true,
});
export type InsertContextTimelineEvent = z.infer<typeof insertContextTimelineEventSchema>;
export type ContextTimelineEventRow = typeof contextTimelineEventsTable.$inferSelect;

// ── context_entity_links ──────────────────────────────────────────────────────
// Extensible relationships from a Context to any entity in the system:
// projects, goals, cognitive artifacts, clusters, brains, capabilities, etc.
// Uses a polymorphic entity_type + entity_id (text) pattern so future entity
// types require zero schema changes.
export const contextEntityLinksTable = pgTable(
  "context_entity_links",
  {
    id: text("id").primaryKey(),
    contextId: text("context_id")
      .notNull()
      .references(() => executiveContextsTable.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    // Flexible text id: covers integer PKs (stored as string) and UUID strings
    entityId: text("entity_id").notNull(),
    relationshipDescription: text("relationship_description"),
    addedBy: text("added_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Enforce: one context-entity pair per type
    unique("context_entity_links_unique").on(t.contextId, t.entityType, t.entityId),
    index("context_entity_links_context_id_idx").on(t.contextId),
    index("context_entity_links_entity_type_idx").on(t.entityType),
    index("context_entity_links_entity_id_idx").on(t.entityId),
  ],
);

export const insertContextEntityLinkSchema = createInsertSchema(contextEntityLinksTable).omit({
  createdAt: true,
});
export type InsertContextEntityLink = z.infer<typeof insertContextEntityLinkSchema>;
export type ContextEntityLinkRow = typeof contextEntityLinksTable.$inferSelect;
