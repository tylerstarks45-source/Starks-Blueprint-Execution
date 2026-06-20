import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";
import { usersTable } from "./users";

export const REVENUE_PROVIDERS = ["stripe", "gumroad", "paypal"] as const;
export type RevenueProviderKind = (typeof REVENUE_PROVIDERS)[number];

export const systemRevenueProvidersTable = pgTable("system_revenue_providers", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  credentialKey: text("credential_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncStatus: text("sync_status").notNull().default("idle"),
  syncMessage: text("sync_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("system_revenue_providers_system_id_idx").on(t.systemInstanceId),
  index("system_revenue_providers_user_id_idx").on(t.userId),
]);

export const insertSystemRevenueProviderSchema = createInsertSchema(systemRevenueProvidersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSystemRevenueProvider = z.infer<typeof insertSystemRevenueProviderSchema>;
export type SystemRevenueProvider = typeof systemRevenueProvidersTable.$inferSelect;
