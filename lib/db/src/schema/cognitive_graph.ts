import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { cognitiveArtifactsTable } from "./cognitive_artifacts";

// ─── Cognitive Knowledge Graph (Build 005) ───────────────────────────────────
//
// The semantic layer that connects Cognitive Artifacts into an explainable,
// navigable network. A Decision is not isolated — it supports, contradicts,
// supersedes, and produces other artifacts. This file declares the three
// structural tables that give the Knowledge Graph its shape:
//
//   cognitive_relationships — directed, typed, explainable edges
//   cognitive_clusters      — named groupings of closely-related artifacts
//   cognitive_cluster_members — many-to-many membership with provenance
//
// Design invariants (same as Build 004):
//   - UUID text PKs for global uniqueness and cross-system traceability.
//   - Soft-delete only (is_deleted flag): the graph must remain historically
//     auditable. Hard-deletes are a human governance decision, not an AI one.
//   - Future relationship types require zero schema changes (type discriminator).
//   - `metadata` JSONB on each table is the forward-compatibility escape hatch.

// ── Relationship types ────────────────────────────────────────────────────────
// The full taxonomy is kept here so it can be referenced from the service
// layer and from future validation rules without re-importing the service.
export const COGNITIVE_RELATIONSHIP_TYPES = [
  "derived_from",   // This artifact was produced by the source artifact
  "supports",       // This artifact provides evidence for the source
  "contradicts",    // This artifact conflicts with the source
  "supersedes",     // This artifact replaces an older source artifact
  "depends_on",     // This artifact cannot exist without the source
  "explains",       // This artifact clarifies the meaning of the source
  "validates",      // This artifact confirms the correctness of the source
  "references",     // This artifact cites the source for context
  "related_to",     // General semantic relatedness (weakest type)
  "produces",       // The source artifact directly created this artifact
  "consumed_by",    // The source artifact was used as input to this one
] as const;
export type CognitiveRelationshipType = (typeof COGNITIVE_RELATIONSHIP_TYPES)[number];

// ── Relationship lifecycle ────────────────────────────────────────────────────
// active  → the relationship is current and trusted
// archived → preserved for history but no longer treated as authoritative
// revoked  → explicitly invalidated (e.g. contradicts relationship disproved)
export const COGNITIVE_RELATIONSHIP_LIFECYCLE = ["active", "archived", "revoked"] as const;
export type CognitiveRelationshipLifecycle = (typeof COGNITIVE_RELATIONSHIP_LIFECYCLE)[number];

// ── cognitive_relationships ───────────────────────────────────────────────────
// A directed, typed, explainable edge between two Cognitive Artifacts.
// Every edge must carry:
//   created_by       — the Brain or system component that created it
//   creation_reason  — a human-readable explanation of why the edge exists
//   confidence       — how confident the creator was about this relationship
// Nothing should become connected without an explainable reason.
export const cognitiveRelationshipsTable = pgTable(
  "cognitive_relationships",
  {
    // ── Identity ───────────────────────────────────────────────────────────
    id: text("id").primaryKey(),

    // ── Edge endpoints ─────────────────────────────────────────────────────
    // Directed: source → target. The relationship_type is always read from
    // source's perspective: "source derived_from target" means source was
    // derived from target.
    sourceArtifactId: text("source_artifact_id")
      .notNull()
      .references(() => cognitiveArtifactsTable.id, { onDelete: "cascade" }),
    targetArtifactId: text("target_artifact_id")
      .notNull()
      .references(() => cognitiveArtifactsTable.id, { onDelete: "cascade" }),

    // ── Relationship model ─────────────────────────────────────────────────
    relationshipType: text("relationship_type").notNull(),

    // ── Explainability (mandatory, not optional) ───────────────────────────
    createdBy: text("created_by").notNull(),
    creationReason: text("creation_reason").notNull(),
    confidence: text("confidence").notNull().default("unknown"),

    // ── Lifecycle / version ────────────────────────────────────────────────
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    // version starts at 1; incremented if a relationship is updated in-place
    // (rare: most updates should revoke + create a new edge instead)
    version: integer("version").notNull().default(1),

    // ── Soft delete ────────────────────────────────────────────────────────
    // The graph must remain historically auditable. is_deleted=true rows are
    // excluded from all standard service queries but never hard-deleted by AI.
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // ── Forward-compatibility ──────────────────────────────────────────────
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Ownership / scope ─────────────────────────────────────────────────
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    // Primary retrieval patterns
    index("cognitive_rels_source_idx").on(t.sourceArtifactId),
    index("cognitive_rels_target_idx").on(t.targetArtifactId),
    index("cognitive_rels_type_idx").on(t.relationshipType),
    index("cognitive_rels_lifecycle_idx").on(t.lifecycleStatus),
    index("cognitive_rels_is_deleted_idx").on(t.isDeleted),
    index("cognitive_rels_user_id_idx").on(t.userId),
    // Neighborhood traversal: all active edges touching an artifact
    index("cognitive_rels_source_type_deleted_idx").on(t.sourceArtifactId, t.relationshipType, t.isDeleted),
    index("cognitive_rels_target_type_deleted_idx").on(t.targetArtifactId, t.relationshipType, t.isDeleted),
    // Chronological
    index("cognitive_rels_created_at_idx").on(t.createdAt),
  ],
);

export const insertCognitiveRelationshipSchema = createInsertSchema(cognitiveRelationshipsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertCognitiveRelationship = z.infer<typeof insertCognitiveRelationshipSchema>;
export type CognitiveRelationship = typeof cognitiveRelationshipsTable.$inferSelect;

// ── cognitive_clusters ────────────────────────────────────────────────────────
// A named grouping of closely-related Cognitive Artifacts.
// Initially: manually-created groups. Future: auto-classified by connected
// components or topic clustering algorithms.
export const COGNITIVE_CLUSTER_TYPES = ["manual", "auto"] as const;
export type CognitiveClusterType = (typeof COGNITIVE_CLUSTER_TYPES)[number];

export const cogitiveClustersTable = pgTable(
  "cognitive_clusters",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    // manual = human/AI created explicitly; auto = system-derived (future)
    clusterType: text("cluster_type").notNull().default("manual"),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    // Extension point for future classification metadata, auto-clustering
    // parameters, confidence scores, review status, etc.
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("cognitive_clusters_user_id_idx").on(t.userId),
    index("cognitive_clusters_type_idx").on(t.clusterType),
    index("cognitive_clusters_lifecycle_idx").on(t.lifecycleStatus),
    index("cognitive_clusters_created_at_idx").on(t.createdAt),
  ],
);

export const insertCognitiveClusterSchema = createInsertSchema(cogitiveClustersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertCognitiveCluster = z.infer<typeof insertCognitiveClusterSchema>;
export type CognitiveCluster = typeof cogitiveClustersTable.$inferSelect;

// ── cognitive_cluster_members ─────────────────────────────────────────────────
// Many-to-many membership: each artifact can belong to multiple clusters,
// and each cluster can contain many artifacts.
// Membership must carry provenance: who added it, and why.
export const cognitiveClusterMembersTable = pgTable(
  "cognitive_cluster_members",
  {
    id: text("id").primaryKey(),
    clusterId: text("cluster_id")
      .notNull()
      .references(() => cogitiveClustersTable.id, { onDelete: "cascade" }),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => cognitiveArtifactsTable.id, { onDelete: "cascade" }),
    membershipReason: text("membership_reason"),
    addedBy: text("added_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Enforce: one artifact can only appear once per cluster
    unique("cognitive_cluster_members_unique").on(t.clusterId, t.artifactId),
    index("cognitive_cluster_members_cluster_id_idx").on(t.clusterId),
    index("cognitive_cluster_members_artifact_id_idx").on(t.artifactId),
  ],
);

export const insertCognitiveClusterMemberSchema = createInsertSchema(cognitiveClusterMembersTable).omit({
  createdAt: true,
});
export type InsertCognitiveClusterMember = z.infer<typeof insertCognitiveClusterMemberSchema>;
export type CognitiveClusterMember = typeof cognitiveClusterMembersTable.$inferSelect;
