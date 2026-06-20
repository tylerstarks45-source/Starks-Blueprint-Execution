import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const abTestsTable = pgTable("ab_tests", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("running"),
  config: jsonb("config").notNull().$type<Record<string, unknown>>().default({}),
  winnerVariantId: integer("winner_variant_id"),
  token: text("token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  concludedAt: timestamp("concluded_at", { withTimezone: true }),
}, (t) => [
  index("ab_tests_system_instance_id_idx").on(t.systemInstanceId),
  index("ab_tests_user_id_idx").on(t.userId),
  index("ab_tests_status_idx").on(t.status),
  index("ab_tests_token_idx").on(t.token),
]);

export type AbTest = typeof abTestsTable.$inferSelect;
export type InsertAbTest = typeof abTestsTable.$inferInsert;
