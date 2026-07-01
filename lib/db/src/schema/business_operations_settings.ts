import { pgTable, serial, integer, boolean, jsonb, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

// ASH Operations Mode permission categories. Each defaults to false — the
// business owner must explicitly grant each category, even after enabling
// Operations Mode.
export const OPERATIONS_PERMISSION_CATEGORIES = [
  "monitorOnly",
  "draftContent",
  "schedulePosts",
  "autoFixLowRisk",
  "autoFixHighRisk",
] as const;
export type OperationsPermissionCategory = (typeof OPERATIONS_PERMISSION_CATEGORIES)[number];

export type OperationsPermissions = Record<OperationsPermissionCategory, boolean>;

export const DEFAULT_OPERATIONS_PERMISSIONS: OperationsPermissions = {
  monitorOnly: true,
  draftContent: false,
  schedulePosts: false,
  autoFixLowRisk: false,
  autoFixHighRisk: false,
};

export const businessOperationsSettingsTable = pgTable("business_operations_settings", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  permissions: jsonb("permissions").notNull().default(DEFAULT_OPERATIONS_PERMISSIONS),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("business_operations_settings_business_id_key").on(t.businessId),
  index("business_operations_settings_business_id_idx").on(t.businessId),
]);

export const insertBusinessOperationsSettingsSchema = createInsertSchema(businessOperationsSettingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusinessOperationsSettings = z.infer<typeof insertBusinessOperationsSettingsSchema>;
export type BusinessOperationsSettings = typeof businessOperationsSettingsTable.$inferSelect;
