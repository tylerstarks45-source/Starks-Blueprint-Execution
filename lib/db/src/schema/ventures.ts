import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { businessesTable } from "./businesses";

// Venture Factory: the AI employees (ASH specialists) assigned to a business. The owner can pause one
// for a business; ASH then can't delegate to it there.
export const businessTeamTable = pgTable("business_team", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  focus: text("focus").notNull().default(""),
  status: text("status").notNull().default("active"),
  lastTask: text("last_task"),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("business_team_business_role_idx").on(t.businessId, t.role)]);

// Owner-recorded expenses per business (and optionally per income stream). Revenue is never entered
// here: it only comes from connected payment providers.
export const businessExpensesTable = pgTable("business_expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  streamId: integer("stream_id"),
  amountCents: integer("amount_cents").notNull(),
  category: text("category").notNull().default("other"),
  description: text("description").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("business_expenses_business_idx").on(t.businessId, t.occurredAt)]);

export type BusinessTeamMember = typeof businessTeamTable.$inferSelect;
export type BusinessExpense = typeof businessExpensesTable.$inferSelect;
