import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ashProjectsTable } from "./executive_brain";

// ─── ASH Brain v2.0 — Project Memory (Phase 1.2) ───────────────────────────
// One row per fact/artifact-pointer/decision worth remembering about an
// `ash_projects` project. Goals and tasks already have their own tables
// (ash_goals / ash_tasks, Phase 1.1) and are NOT duplicated here — this table
// covers everything else the Phase 1.2 spec calls out for "Project Memory":
// conversation summaries, decisions, pointers to files/websites/landing
// pages/connected platforms/AI tools, business notes, lessons learned, and
// build-progress notes.

export const ASH_PROJECT_MEMORY_TYPES = [
  "conversation_summary",
  "decision",
  "file_ref",
  "website_ref",
  "landing_page_ref",
  "connected_platform_ref",
  "ai_tool_ref",
  "business_note",
  "lesson_learned",
  "build_progress",
] as const;
export type AshProjectMemoryType = (typeof ASH_PROJECT_MEMORY_TYPES)[number];

export const ashProjectMemoryTable = pgTable(
  "ash_project_memory",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => ashProjectsTable.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("business_note"),
    title: text("title"),
    content: text("content").notNull(),
    // Free-form pointer data, e.g. { fileId }, { landingPageId }, { url }, { connectorId }.
    metadata: jsonb("metadata").notNull().default({}),
    importanceScore: integer("importance_score").notNull().default(50),
    tags: jsonb("tags").notNull().default([]),
    confidenceScore: integer("confidence_score").notNull().default(100),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ash_project_memory_project_id_idx").on(t.projectId),
    index("ash_project_memory_project_id_type_idx").on(t.projectId, t.type),
  ],
);

export const insertAshProjectMemorySchema = createInsertSchema(ashProjectMemoryTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshProjectMemory = z.infer<typeof insertAshProjectMemorySchema>;
export type AshProjectMemory = typeof ashProjectMemoryTable.$inferSelect;
