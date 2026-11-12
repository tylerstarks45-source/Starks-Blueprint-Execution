import { pgTable, serial, text, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { businessesTable } from "./businesses";

// How much ASH may do on her own. advisor: suggests only; copilot: builds inside
// the account, asks before anything goes live or costs money; operator: runs
// things within the owner's rules; autopilot: runs everything within limits.
export const ASH_CONTROL_LEVELS = ["advisor", "copilot", "operator", "autopilot"] as const;
export type AshControlLevel = (typeof ASH_CONTROL_LEVELS)[number];

// Kinds of action the owner can force through the approvals inbox at any level.
export const ASH_ACTION_KINDS = ["build", "publish", "email_customers", "spend", "delete", "connect_service", "legal"] as const;
export type AshActionKind = (typeof ASH_ACTION_KINDS)[number];

export const DEFAULT_APPROVAL_REQUIRED: AshActionKind[] = ["spend", "delete", "legal"];

// One account-wide row (business_id null) plus optional per-business overrides.
export const ashControlSettingsTable = pgTable("ash_control_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("copilot"),
  dailySpendLimitCents: integer("daily_spend_limit_cents").notNull().default(0),
  monthlySpendLimitCents: integer("monthly_spend_limit_cents").notNull().default(0),
  approvalRequired: jsonb("approval_required").$type<AshActionKind[]>().notNull().default(DEFAULT_APPROVAL_REQUIRED),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ash_control_settings_account_idx").on(t.userId).where(sql`${t.businessId} is null`),
  uniqueIndex("ash_control_settings_business_idx").on(t.userId, t.businessId).where(sql`${t.businessId} is not null`),
]);

// Money ASH actually spent on the owner's behalf; spend limits are checked against it.
export const ashSpendEventsTable = pgTable("ash_spend_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
  missionId: integer("mission_id"),
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ash_spend_events_user_created_idx").on(t.userId, t.createdAt),
]);

export const MISSION_STATUSES = ["planning", "running", "waiting_approval", "waiting_owner", "paused", "completed", "failed", "cancelled"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export interface MissionStep {
  title: string;
  status: "pending" | "done" | "skipped";
  result?: string;
}

export interface MissionLogEntry {
  at: string;
  kind: "plan" | "step" | "tool" | "approval" | "owner" | "error" | "status";
  message: string;
}

// A long-running goal ASH works on across ticks and restarts.
export const ashMissionsTable = pgTable("ash_missions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("planning"),
  steps: jsonb("steps").$type<MissionStep[]>().notNull().default([]),
  log: jsonb("log").$type<MissionLogEntry[]>().notNull().default([]),
  waitingFor: text("waiting_for"),
  approvalId: integer("approval_id"),
  stepRuns: integer("step_runs").notNull().default(0),
  maxStepRuns: integer("max_step_runs").notNull().default(20),
  failureCount: integer("failure_count").notNull().default(0),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ash_missions_user_idx").on(t.userId, t.createdAt),
  index("ash_missions_due_idx").on(t.status, t.nextRunAt),
]);

export type AshControlSettings = typeof ashControlSettingsTable.$inferSelect;
export type AshMission = typeof ashMissionsTable.$inferSelect;
