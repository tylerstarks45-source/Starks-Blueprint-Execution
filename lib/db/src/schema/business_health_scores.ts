import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { ownershipColumns, projectScopeColumn } from "./governance";

export const businessHealthScoresTable = pgTable("business_health_scores", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  overallHealth: integer("overall_health").notNull(),
  automationScore: integer("automation_score").notNull(),
  growthScore: integer("growth_score").notNull(),
  marketingScore: integer("marketing_score").notNull(),
  seoScore: integer("seo_score").notNull(),
  contentScore: integer("content_score").notNull(),
  summary: text("summary"),
  revenueOpportunities: jsonb("revenue_opportunities").notNull().default([]),
  operationalRisks: jsonb("operational_risks").notNull().default([]),
  missingIntegrations: jsonb("missing_integrations").notNull().default([]),
  recommendations: jsonb("recommendations").notNull().default([]),
  estimatedGrowthPotential: text("estimated_growth_potential"),
  ...ownershipColumns(),
  ...projectScopeColumn(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("business_health_scores_business_id_idx").on(t.businessId),
  index("business_health_scores_business_id_created_at_idx").on(t.businessId, t.createdAt),
  index("business_health_scores_owner_user_id_idx").on(t.ownerUserId),
]);

export const insertBusinessHealthScoreSchema = createInsertSchema(businessHealthScoresTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBusinessHealthScore = z.infer<typeof insertBusinessHealthScoreSchema>;
export type BusinessHealthScore = typeof businessHealthScoresTable.$inferSelect;
