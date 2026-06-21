import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const milestoneEventsTable = pgTable("milestone_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  amountCents: integer("amount_cents").notNull(),
  milestoneLabel: text("milestone_label").notNull(),
  systemType: text("system_type"),
  bestCategory: text("best_category"),
  featured: boolean("featured").notNull().default(false),
  reachedAt: timestamp("reached_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MilestoneEvent = typeof milestoneEventsTable.$inferSelect;
export type InsertMilestoneEvent = typeof milestoneEventsTable.$inferInsert;
