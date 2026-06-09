import { pgTable, serial, text, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { blueprintsTable } from "./blueprints";

export const systemInstancesTable = pgTable("system_instances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blueprintId: integer("blueprint_id").notNull().references(() => blueprintsTable.id),
  name: text("name").notNull(),
  buildStatus: text("build_status").notNull().default("pending"),
  healthStatus: text("health_status").notNull().default("unknown"),
  fileTree: jsonb("file_tree"),
  savedImages: jsonb("saved_images"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("system_instances_user_id_idx").on(t.userId),
  index("system_instances_user_id_build_status_idx").on(t.userId, t.buildStatus),
]);

export const insertSystemInstanceSchema = createInsertSchema(systemInstancesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSystemInstance = z.infer<typeof insertSystemInstanceSchema>;
export type SystemInstance = typeof systemInstancesTable.$inferSelect;
