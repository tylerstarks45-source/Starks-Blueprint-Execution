import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";

export const systemConnectorsTable = pgTable("system_connectors", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id")
    .notNull()
    .references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  connector: text("connector").notNull(),
  status: text("status").notNull().default("unconfigured"),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("system_connectors_instance_id_idx").on(t.systemInstanceId),
  index("system_connectors_instance_connector_idx").on(t.systemInstanceId, t.connector),
]);

export const insertSystemConnectorSchema = createInsertSchema(systemConnectorsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertSystemConnector = z.infer<typeof insertSystemConnectorSchema>;
export type SystemConnector = typeof systemConnectorsTable.$inferSelect;
