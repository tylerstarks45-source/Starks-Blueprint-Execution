import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";

// Mirrors OPERATIONS_PERMISSION_CATEGORIES in business_operations_settings.ts —
// which permission category the proposed action falls under.
export const APPROVAL_CATEGORIES = [
  "monitorOnly",
  "draftContent",
  "schedulePosts",
  "autoFixLowRisk",
  "autoFixHighRisk",
] as const;
export type ApprovalCategory = (typeof APPROVAL_CATEGORIES)[number];

export const APPROVAL_RISK_LEVELS = ["low", "high"] as const;
export type ApprovalRiskLevel = (typeof APPROVAL_RISK_LEVELS)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// ASH creates a row here whenever it wants to take a higher-risk action on a
// business under Operations Mode. The owning user approves or rejects it from
// the Pending Approvals queue. Low-risk categories the user has already
// granted are expected to execute automatically without a row here — this
// table is for actions that need a human in the loop.
export const pendingApprovalsTable = pgTable("pending_approvals", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  riskLevel: text("risk_level").notNull().default("high"),
  title: text("title").notNull(),
  description: text("description"),
  payload: jsonb("payload").notNull().default({}),
  status: text("status").notNull().default("pending"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("pending_approvals_business_id_idx").on(t.businessId),
  index("pending_approvals_user_id_status_idx").on(t.userId, t.status),
  index("pending_approvals_business_id_status_idx").on(t.businessId, t.status),
]);

export const insertPendingApprovalSchema = createInsertSchema(pendingApprovalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPendingApproval = z.infer<typeof insertPendingApprovalSchema>;
export type PendingApproval = typeof pendingApprovalsTable.$inferSelect;
