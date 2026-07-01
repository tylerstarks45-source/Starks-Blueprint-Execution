import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import type { HealthIssue } from "./system_health_scores";

// Per-dimension continuous-monitoring snapshot for a business. Parallel to
// `system_health_scores` but for the business entity. Distinct from the
// LLM-driven `business_health_scores` table (that one is an ASH narrative
// analysis; this one is a live operational monitoring signal recomputed by
// the scheduler on an interval/event).
export const businessHealthMetricsTable = pgTable("business_health_metrics", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").notNull(),
  status: text("status").notNull().default("healthy"),
  connectionScore: integer("connection_score").notNull(),
  hostingScore: integer("hosting_score").notNull(),
  apiScore: integer("api_score").notNull(),
  seoScore: integer("seo_score").notNull(),
  performanceScore: integer("performance_score").notNull(),
  securityScore: integer("security_score").notNull(),
  revenueScore: integer("revenue_score").notNull(),
  automationScore: integer("automation_score").notNull(),
  issues: jsonb("issues").notNull().default([]).$type<HealthIssue[]>(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("business_health_metrics_business_id_idx").on(t.businessId),
  index("business_health_metrics_business_id_computed_at_idx").on(t.businessId, t.computedAt),
]);

export const insertBusinessHealthMetricSchema = createInsertSchema(businessHealthMetricsTable).omit({
  id: true,
  computedAt: true,
});
export type InsertBusinessHealthMetric = z.infer<typeof insertBusinessHealthMetricSchema>;
export type BusinessHealthMetric = typeof businessHealthMetricsTable.$inferSelect;
