import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";

// Per-dimension continuous-monitoring snapshot for a system instance.
// Distinct from the AI-driven `business_health_scores` analysis — this is
// computed on an interval/event by the scheduler from live signals
// (connector status, job failures, scheduled task health) rather than an LLM.
export const HEALTH_DIMENSIONS = [
  "connection",
  "hosting",
  "api",
  "seo",
  "performance",
  "security",
  "revenue",
  "automation",
] as const;
export type HealthDimension = (typeof HEALTH_DIMENSIONS)[number];

export const HEALTH_STATUSES = ["healthy", "degraded", "critical"] as const;
export type HealthStatusLevel = (typeof HEALTH_STATUSES)[number];

export interface HealthIssue {
  dimension: HealthDimension;
  severity: "low" | "high";
  message: string;
  autoFixable: boolean;
  autoFixed: boolean;
}

export const systemHealthScoresTable = pgTable("system_health_scores", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id, { onDelete: "cascade" }),
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
  index("system_health_scores_system_instance_id_idx").on(t.systemInstanceId),
  index("system_health_scores_system_instance_id_computed_at_idx").on(t.systemInstanceId, t.computedAt),
]);

export const insertSystemHealthScoreSchema = createInsertSchema(systemHealthScoresTable).omit({
  id: true,
  computedAt: true,
});
export type InsertSystemHealthScore = z.infer<typeof insertSystemHealthScoreSchema>;
export type SystemHealthScore = typeof systemHealthScoresTable.$inferSelect;
