import { pgTable, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ashProjectsTable } from "./executive_brain";

// ─── Cognitive Artifacts — Build 004: Cognitive Memory Architecture ───────────
//
// The foundation of ASH's long-term Cognitive Memory. Every Executive decision,
// objective analysis, reasoning graph, and future cognitive product is a
// Cognitive Artifact — a first-class, persisted, traceable record of how the
// system thought.
//
// Architecture philosophy:
//   - Single unified table with artifact_type discriminator. Avoids per-type
//     table proliferation and lets future artifact types be added without
//     schema redesign.
//   - All artifact-specific payloads live in `content` (JSONB). The outer
//     columns are the stable retrieval surface — indexed, queryable, permanent.
//   - `relationships` enables a future artifact graph (supersedes, related,
//     superseded_by). Not yet enforced — design-time reservation.
//   - `metadata` is the forward-compatibility escape hatch: outcome tracking,
//     review status, lesson extraction, importance scoring, retention policy.
//   - `objective_text` is a denormalized retrieval helper for text search on
//     what the artifact was about, without needing to parse `content`.
//
// Cognitive lifecycle: Observe → Reason → Decide → Record → Consolidate →
//   Retrieve → Reflect → Learn → Improve.
// This table is the "Record + Consolidate" step. Future builds extend the rest.

// ── Artifact type discriminator ───────────────────────────────────────────────
// Extend this list in code (not schema) to add new artifact types.
// Schema is stable; type diversity lives in the application layer.
export const COGNITIVE_ARTIFACT_TYPES = [
  "decision_record",
  "objective_analysis",
  "reasoning_graph",
  "collaboration_plan",
  "reflection",
  "lesson",
  "insight",
  "strategy",
  "observation",
  "pattern",
  "knowledge",
] as const;
export type CognitiveArtifactType = (typeof COGNITIVE_ARTIFACT_TYPES)[number];

// ── Lifecycle status ──────────────────────────────────────────────────────────
// active    → the artifact is current and trusted
// archived  → no longer current but preserved for history
// superseded → replaced by a newer artifact (relationships.supersededById set)
// retired   → deliberately removed from consideration (e.g. incorrect lesson)
export const COGNITIVE_LIFECYCLE_STATUSES = ["active", "archived", "superseded", "retired"] as const;
export type CognitiveLifecycleStatus = (typeof COGNITIVE_LIFECYCLE_STATUSES)[number];

// ── Table ─────────────────────────────────────────────────────────────────────
export const cognitiveArtifactsTable = pgTable(
  "cognitive_artifacts",
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    // UUID string PK: global uniqueness enables future cross-system traceability.
    // Application generates the UUID (crypto.randomUUID()); DB stores as text.
    id: text("id").primaryKey(),

    // ── Artifact model ────────────────────────────────────────────────────────
    artifactType: text("artifact_type").notNull(),
    sourceBrain: text("source_brain").notNull().default("executive-brain"),
    // Which decision_record artifact originated this artifact (null for root
    // decision records themselves; set for derived artifacts like reflections).
    decisionId: text("decision_id"),
    version: integer("version").notNull().default(1),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),

    // ── Confidence (4-dimensional model from Build 003) ───────────────────────
    confidenceOverall: text("confidence_overall").notNull().default("unknown"),
    confidenceReasoning: text("confidence_reasoning"),
    confidenceCapability: text("confidence_capability"),
    confidenceBrainSelection: text("confidence_brain_selection"),

    // ── Traceability ──────────────────────────────────────────────────────────
    // Which Brains contributed to this artifact.
    brainsSelected: jsonb("brains_selected").notNull().default([]).$type<string[]>(),
    // Which capabilities were exercised.
    capabilitiesUsed: jsonb("capabilities_used").notNull().default([]).$type<string[]>(),
    // Supporting evidence: strings drawn from decision record supportingContext.
    evidence: jsonb("evidence").notNull().default([]).$type<string[]>(),
    // Version tag of the Executive Brain that generated this artifact.
    // Enables future cohort analysis: "did v1.2.0 make better decisions?".
    executiveBrainVersion: text("executive_brain_version"),

    // ── Core content ──────────────────────────────────────────────────────────
    // The complete artifact payload. Shape depends on artifact_type:
    //   decision_record   → DecisionRecord (from Build 003 reasoning.ts)
    //   objective_analysis → ObjectiveAnalysis
    //   reasoning_graph   → CognitiveReasoningGraph
    //   collaboration_plan → CollaborationPlan
    //   (future types add shapes without schema changes)
    content: jsonb("content").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Artifact graph (future) ───────────────────────────────────────────────
    // Declared now so future self-improvement and reflection systems can link
    // artifacts without a schema migration.
    // Shape: { relatedArtifactIds?: string[], supersededById?: string,
    //          supersedes?: string[], derivedFrom?: string[] }
    relationships: jsonb("relationships").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Memory management metadata (future) ───────────────────────────────────
    // Shape: { outcomeStatus?, reviewStatus?, reflectionCompleted?, lessonGenerated?,
    //          memoryImportance?, businessContext?, confidenceHistory?,
    //          retentionPolicy?, evidenceReferences? }
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Retrieval helpers (denormalized) ─────────────────────────────────────
    // Extracted from content for fast text search without parsing JSONB.
    // For decision_record: the objective_analysis.primaryGoal string.
    objectiveText: text("objective_text"),

    // ── Ownership / scope ─────────────────────────────────────────────────────
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    projectId: integer("project_id").references(() => ashProjectsTable.id, { onDelete: "set null" }),

    // ── Timestamps ────────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    // Retrieval by type — the most common filter
    index("cognitive_artifacts_artifact_type_idx").on(t.artifactType),
    // Retrieval by producing Brain — "which decisions did the planning-engine participate in?"
    index("cognitive_artifacts_source_brain_idx").on(t.sourceBrain),
    // Traceability: find all artifacts derived from a root decision
    index("cognitive_artifacts_decision_id_idx").on(t.decisionId),
    // Lifecycle management
    index("cognitive_artifacts_lifecycle_status_idx").on(t.lifecycleStatus),
    // Confidence-based retrieval
    index("cognitive_artifacts_confidence_overall_idx").on(t.confidenceOverall),
    // Per-user retrieval (most queries will be user-scoped)
    index("cognitive_artifacts_user_id_idx").on(t.userId),
    index("cognitive_artifacts_project_id_idx").on(t.projectId),
    // Chronological retrieval (newest first is the default view)
    index("cognitive_artifacts_created_at_idx").on(t.createdAt),
    // Composite: user + type + lifecycle — the most frequent historical query
    index("cognitive_artifacts_user_type_lifecycle_idx").on(t.userId, t.artifactType, t.lifecycleStatus),
  ],
);

export const insertCognitiveArtifactSchema = createInsertSchema(cognitiveArtifactsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertCognitiveArtifact = z.infer<typeof insertCognitiveArtifactSchema>;
export type CognitiveArtifact = typeof cognitiveArtifactsTable.$inferSelect;
