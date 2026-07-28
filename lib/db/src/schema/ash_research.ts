import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ashProjectsTable } from "./executive_brain";
import { ashKnowledgeEntriesTable } from "./ash_knowledge_entries";

// ─── ASH Brain v2.0 — Research & Knowledge Engine (Phase 1.4) ──────────────
// Sits between the Executive Brain and the existing AI Orchestrator's
// search/tool primitives (see lib/research-engine/). Two tables:
//
// - ash_research_sessions: one row per research request, tracking the whole
//   plan → gather → dedupe → score → summarize → save workflow for
//   observability/history. The actual reusable output lives in
//   ash_knowledge_entries (Phase 1.2) via resultKnowledgeEntryId.
// - ash_research_profiles: structured, type-specific detail (competitor
//   analysis fields, AI tool knowledge fields, etc.) that's richer than a
//   generic knowledge entry can hold. `profileType` is a discriminator so
//   new structured profile types can be added without a schema change —
//   they just add a new `data` shape.

export const ASH_RESEARCH_TYPES = [
  "business",
  "competitor",
  "market",
  "seo",
  "product",
  "technology",
  "ai_tool",
  "trend",
] as const;
export type AshResearchType = (typeof ASH_RESEARCH_TYPES)[number];

export const ASH_RESEARCH_SESSION_STATUSES = ["pending", "researching", "completed", "failed"] as const;
export type AshResearchSessionStatus = (typeof ASH_RESEARCH_SESSION_STATUSES)[number];

export const ashResearchSessionsTable = pgTable(
  "ash_research_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").references(() => ashProjectsTable.id, { onDelete: "set null" }),
    researchType: text("research_type").notNull().default("business"),
    objective: text("objective").notNull(),
    status: text("status").notNull().default("pending"),
    // The generated research plan: { steps: [{ query, purpose }] }.
    plan: jsonb("plan").notNull().default({}),
    reusedExistingKnowledge: integer("reused_existing_knowledge").notNull().default(0), // 0/1 boolean (see note below)
    sourcesCount: integer("sources_count").notNull().default(0),
    avgReliabilityScore: integer("avg_reliability_score"),
    findingsSummary: text("findings_summary"),
    resultKnowledgeEntryId: integer("result_knowledge_entry_id").references(() => ashKnowledgeEntriesTable.id, { onDelete: "set null" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("ash_research_sessions_user_id_idx").on(t.userId),
    index("ash_research_sessions_project_id_idx").on(t.projectId),
    index("ash_research_sessions_user_id_research_type_idx").on(t.userId, t.researchType),
  ],
);

export const insertAshResearchSessionSchema = createInsertSchema(ashResearchSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAshResearchSession = z.infer<typeof insertAshResearchSessionSchema>;
export type AshResearchSession = typeof ashResearchSessionsTable.$inferSelect;

// ── Structured research profiles (competitor / AI tool / future types) ────

export const ASH_RESEARCH_PROFILE_TYPES = ["competitor", "ai_tool"] as const;
export type AshResearchProfileType = (typeof ASH_RESEARCH_PROFILE_TYPES)[number];

export const ashResearchProfilesTable = pgTable(
  "ash_research_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    sourceProjectId: integer("source_project_id").references(() => ashProjectsTable.id, { onDelete: "set null" }),
    knowledgeEntryId: integer("knowledge_entry_id").references(() => ashKnowledgeEntriesTable.id, { onDelete: "set null" }),
    profileType: text("profile_type").notNull(),
    name: text("name").notNull(), // company name or tool name
    // Type-specific structured fields. For profileType="competitor":
    // { companyOverview, products, services, pricing, strengths, weaknesses,
    //   opportunities, threats, marketingStrategy, seoPresence, technologyStack }
    // For profileType="ai_tool":
    // { purpose, features, pricing, strengths, weaknesses, recommendedUseCases }
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ash_research_profiles_user_id_idx").on(t.userId),
    index("ash_research_profiles_user_id_profile_type_idx").on(t.userId, t.profileType),
  ],
);

export const insertAshResearchProfileSchema = createInsertSchema(ashResearchProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshResearchProfile = z.infer<typeof insertAshResearchProfileSchema>;
export type AshResearchProfile = typeof ashResearchProfilesTable.$inferSelect;
