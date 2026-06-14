import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const generatedFilesTable = pgTable("generated_files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  name: text("name").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type").notNull().default("text"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("generated_files_user_id_idx").on(t.userId),
  index("generated_files_session_id_idx").on(t.sessionId),
]);

export type GeneratedFile = typeof generatedFilesTable.$inferSelect;
export type InsertGeneratedFile = typeof generatedFilesTable.$inferInsert;
