import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { businessesTable } from "./businesses";
import { ashMissionsTable } from "./ash_control";

export interface StrategyReviewMetrics {
  revenueTracked: boolean;
  verifiedLast30Cents: number | null;
  netLast30Cents: number | null;
  targetMonthlyRevenueCents: number | null;
  progressPct: number | null;
  milestonesDone: number;
  milestonesTotal: number;
}

// ASH's periodic check of an income mission's measured results against its target, with proposed next steps.
export const strategyReviewsTable = pgTable("strategy_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  missionId: integer("mission_id").notNull().references(() => ashMissionsTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
  verdict: text("verdict").notNull(), // on_track | behind | no_data
  summary: text("summary").notNull(),
  adjustments: jsonb("adjustments").$type<string[]>().notNull().default([]),
  metrics: jsonb("metrics").$type<StrategyReviewMetrics>().notNull(),
  status: text("status").notNull().default("proposed"), // proposed | applied | dismissed
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("strategy_reviews_mission_idx").on(t.missionId, t.createdAt),
]);

export type StrategyReview = typeof strategyReviewsTable.$inferSelect;
