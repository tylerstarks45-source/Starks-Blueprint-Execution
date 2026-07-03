import { pgTable, serial, integer, bigint, text, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── ASH self-improving brain (task #312) ──────────────────────────────────
// Durable, privacy-safe "lessons" distilled from real platform outcomes. A
// lesson is an aggregate pattern for a scope (a niche/business type, a
// blueprint category, or a tool), NOT any single user's private data — it
// captures what actually earned money vs. what stalled, so ASH can ground
// future plans/builds/recommendations in proven patterns.
//
// Kept as plain string columns (not DB enums) so new scope types / outcomes
// can be added without a migration, matching the pattern used elsewhere
// (business_recommendations.category, pending_approvals.category).

// What a lesson is scoped to. "niche" = businesses.businessType,
// "blueprint_category" = blueprint_categories.name, "tool" = tools.name.
export const ASH_LESSON_SCOPE_TYPES = ["niche", "blueprint_category", "tool"] as const;
export type AshLessonScopeType = (typeof ASH_LESSON_SCOPE_TYPES)[number];

// Distilled verdict for a scope, derived from sample size + success ratio.
// "proven" = enough runs and a majority earned; "promising" = some earned but
// thin/mixed; "struggling" = runs exist but ~none earned; "emerging" = too
// little data to claim anything (honest fallback).
export const ASH_LESSON_OUTCOMES = ["proven", "promising", "struggling", "emerging"] as const;
export type AshLessonOutcome = (typeof ASH_LESSON_OUTCOMES)[number];

export const ashLessonsTable = pgTable(
  "ash_lessons",
  {
    id: serial("id").primaryKey(),
    scopeType: text("scope_type").notNull(),
    scopeKey: text("scope_key").notNull(),
    scopeLabel: text("scope_label"),
    // How many systems/businesses fell into this scope during distillation.
    sampleSize: integer("sample_size").notNull().default(0),
    // How many of those earned any real revenue.
    successCount: integer("success_count").notNull().default(0),
    totalRevenueCents: bigint("total_revenue_cents", { mode: "number" }).notNull().default(0),
    avgRevenueCents: integer("avg_revenue_cents").notNull().default(0),
    // Average latest business health (0-100) for the scope, null if unscored.
    avgHealth: integer("avg_health"),
    // Ranked tools that co-occurred with revenue in this scope:
    // [{ toolId, name, revenueCents, count }]
    topTools: jsonb("top_tools").notNull().default([]),
    outcome: text("outcome").notNull().default("emerging"),
    // Deterministic, honest human-readable lesson (no fabricated claims).
    summary: text("summary").notNull(),
    // 0-100 — grows with volume × success ratio; low when data is thin.
    confidence: integer("confidence").notNull().default(0),
    // Extra structured facts for the UI / future weighting.
    metrics: jsonb("metrics").notNull().default({}),
    lastDistilledAt: timestamp("last_distilled_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("ash_lessons_scope_idx").on(t.scopeType, t.scopeKey),
    index("ash_lessons_scope_type_idx").on(t.scopeType),
    index("ash_lessons_confidence_idx").on(t.confidence),
  ],
);

export const insertAshLessonSchema = createInsertSchema(ashLessonsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshLesson = z.infer<typeof insertAshLessonSchema>;
export type AshLesson = typeof ashLessonsTable.$inferSelect;
