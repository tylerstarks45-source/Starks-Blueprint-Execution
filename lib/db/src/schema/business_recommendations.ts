import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { toolsTable } from "./tools";

// Categories the AI Improvement Engine can classify a recommendation into
// (task #248, step 2). Kept as a plain string column (not a DB enum) so new
// categories can be added without a migration, mirroring the pattern used by
// pending_approvals.category.
export const RECOMMENDATION_CATEGORIES = [
  "conversion",
  "seo",
  "marketing",
  "automation",
  "revenue",
  "content",
  "risk",
] as const;
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

// "improvement_pass" = produced by the scheduled per-business improvement
// pass (task #248 step 2). "root_cause_research" = produced by the
// self-healing escalation research loop (task #248 step 3) — surfaced here
// too so a researched fix a user declines to auto-run still shows up as an
// actionable recommendation, not just a Pending Approval row.
export const RECOMMENDATION_SOURCE_TYPES = ["improvement_pass", "root_cause_research"] as const;
export type RecommendationSourceType = (typeof RECOMMENDATION_SOURCE_TYPES)[number];

// "stale" = superseded by a newer improvement pass for the same business
// without the user having acted on it — kept for history instead of deleted.
export const RECOMMENDATION_STATUSES = ["new", "dismissed", "applied", "stale"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const businessRecommendationsTable = pgTable(
  "business_recommendations",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    confidence: integer("confidence").notNull().default(50),
    status: text("status").notNull().default("new"),
    sourceType: text("source_type").notNull().default("improvement_pass"),
    // Marketplace-first: when the AI's suggestion matches an existing catalog
    // tool, we link it here instead of describing an external tool by name.
    suggestedToolId: integer("suggested_tool_id").references(() => toolsTable.id, { onDelete: "set null" }),
    payload: jsonb("payload").notNull().default({}),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("business_recommendations_business_id_idx").on(t.businessId),
    index("business_recommendations_business_id_status_idx").on(t.businessId, t.status),
    index("business_recommendations_business_id_source_idx").on(t.businessId, t.sourceType),
  ],
);

export const insertBusinessRecommendationSchema = createInsertSchema(businessRecommendationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusinessRecommendation = z.infer<typeof insertBusinessRecommendationSchema>;
export type BusinessRecommendation = typeof businessRecommendationsTable.$inferSelect;
