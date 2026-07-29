import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ashProjectsTable } from "./executive_brain";
import { businessesTable } from "./businesses";
import { ownershipColumns } from "./governance";

// ─── ASH Brain v2.0 — Knowledge Memory (Phase 1.2) ─────────────────────────
// Per-user, continuously-learned knowledge: successful/failed patterns, tool
// recommendations, frameworks, playbooks, and project retrospectives written
// when a project completes. This is deliberately separate from the existing
// `ash_lessons` table (see lib/ash-brain.ts) — ash_lessons is a batch-run,
// CROSS-USER aggregate distillation keyed by niche/blueprint/tool, driven by
// an admin/system job. ash_knowledge_entries is real-time, PER-USER, written
// automatically by the Memory Engine as that user's own conversations and
// projects unfold. Both feed the orchestrator; neither replaces the other.

export const ASH_KNOWLEDGE_CATEGORIES = [
  "successful_pattern",
  "failed_pattern",
  "tool_recommendation",
  "framework",
  "playbook",
  "project_retrospective",
  // ── Phase 1.4 — Research & Knowledge Engine categories ──
  "business_research",
  "competitor_profile",
  "market_research",
  "seo_research",
  "product_research",
  "technology_research",
  "ai_tool_profile",
  "trend_research",
] as const;
export type AshKnowledgeCategory = (typeof ASH_KNOWLEDGE_CATEGORIES)[number];

// ─── Business Context Isolation (Phase 1.5A) ───────────────────────────────
// `global`/`industry`/`reusable` are deliberately NOT business-isolated —
// they are the spec's own "meant to be shared" scopes (a marketing
// playbook that worked for one business is exactly the kind of knowledge
// that should resurface for another). Only `business` (and, via
// sourceProjectId, `project`) scoped entries are filtered by ownership so a
// fact learned "about Business B" never leaks into Business A's context.
export const KNOWLEDGE_SCOPES = ["global", "business", "project", "industry", "reusable"] as const;
export type KnowledgeScope = (typeof KNOWLEDGE_SCOPES)[number];

export const ashKnowledgeEntriesTable = pgTable(
  "ash_knowledge_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    sourceProjectId: integer("source_project_id").references(() => ashProjectsTable.id, { onDelete: "set null" }),
    // Phase 1.5A addition — additive/defaulted; existing rows read back as
    // scope='global' (unchanged retrieval behavior: visible everywhere for the user).
    scope: text("scope").notNull().default("global"),
    businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("playbook"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tags: jsonb("tags").notNull().default([]),
    // ── Phase 1.4 additions — Research & Knowledge Engine ──
    // Structured findings/sources for research-derived entries; empty for
    // the original Phase 1.2 pattern/playbook categories, which keep using
    // `content` as free text the way they always have.
    keyFindings: jsonb("key_findings").notNull().default([]), // string[]
    sources: jsonb("sources").notNull().default([]), // { label: string; reliability: number }[]
    // Other ash_projects.id this knowledge has also proven useful for,
    // beyond the project it was originally researched in (sourceProjectId).
    relatedProjectIds: jsonb("related_project_ids").notNull().default([]), // number[]
    // Free-form extension point (e.g. { researchProfileId, researchType }).
    metadata: jsonb("metadata").notNull().default({}),
    importanceScore: integer("importance_score").notNull().default(50),
    confidenceScore: integer("confidence_score").notNull().default(100),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    // Note: this table's own `sourceProjectId` (above) already covers the
    // "project" dimension of governance — no separate projectId column is
    // added here to avoid two competing project references on the same row.
    ...ownershipColumns(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ash_knowledge_entries_user_id_idx").on(t.userId),
    index("ash_knowledge_entries_user_id_category_idx").on(t.userId, t.category),
    index("ash_knowledge_entries_source_project_id_idx").on(t.sourceProjectId),
    index("ash_knowledge_entries_business_id_idx").on(t.businessId),
    index("ash_knowledge_entries_owner_user_id_idx").on(t.ownerUserId),
  ],
);

export const insertAshKnowledgeEntrySchema = createInsertSchema(ashKnowledgeEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshKnowledgeEntry = z.infer<typeof insertAshKnowledgeEntrySchema>;
export type AshKnowledgeEntry = typeof ashKnowledgeEntriesTable.$inferSelect;
