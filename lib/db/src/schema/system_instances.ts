import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { blueprintsTable } from "./blueprints";

export const systemInstancesTable = pgTable("system_instances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  blueprintId: integer("blueprint_id").notNull().references(() => blueprintsTable.id),
  name: text("name").notNull(),
  buildStatus: text("build_status").notNull().default("pending"),
  healthStatus: text("health_status").notNull().default("unknown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSystemInstanceSchema = createInsertSchema(systemInstancesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSystemInstance = z.infer<typeof insertSystemInstanceSchema>;
export type SystemInstance = typeof systemInstancesTable.$inferSelect;
