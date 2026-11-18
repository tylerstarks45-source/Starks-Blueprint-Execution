import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { businessesTable } from "./businesses";

/** What the owner asked for, read from their words. Money in cents; null = not stated. */
export interface IncomeObjective {
  targetMonthlyRevenueCents: number | null;
  budgetCents: number | null;
  timelineMonths: number | null;
  constraints: string[];
}

export interface IncomeOpportunity {
  name: string;
  typeKey: string;
  newType: boolean;
  summary: string;
  startupCostCents: number;
  monthlyCostCents: number;
  monthsToTarget: number | null;
  score: number;
  why: string;
}

export interface IncomePlanDetail {
  businessName: string;
  typeKey: string;
  newType: { name: string; category: string; description: string; streamTypes: string[] } | null;
  market: string;
  strategy: string;
  timeline: string;
  risks: string[];
  permissions: string[];
  milestones: string[];
  startupCostCents: number;
  monthlyCostCents: number;
}

// ASH's researched plan for an income goal. The owner approves it before anything is built;
// approving creates the business and a mission (ash_missions.plan_id).
export const incomePlansTable = pgTable("income_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  goal: text("goal").notNull(),
  objective: jsonb("objective").$type<IncomeObjective>().notNull(),
  options: jsonb("options").$type<IncomeOpportunity[]>().notNull().default([]),
  plan: jsonb("plan").$type<IncomePlanDetail>().notNull(),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
  missionId: integer("mission_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
}, (t) => [index("income_plans_user_idx").on(t.userId, t.createdAt)]);

export type IncomePlan = typeof incomePlansTable.$inferSelect;
