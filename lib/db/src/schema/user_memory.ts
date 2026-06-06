import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const userMemoryTable = pgTable("user_memory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  memoryKey: text("memory_key").notNull(),
  memoryValue: text("memory_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("user_memory_user_id_idx").on(t.userId),
]);

export const insertUserMemorySchema = createInsertSchema(userMemoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;
export type UserMemory = typeof userMemoryTable.$inferSelect;
