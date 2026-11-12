import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";
import { clientWorkspacesTable } from "./client_workspaces";

export const BUSINESS_TYPES = [
  "shopify",
  "wordpress",
  "youtube",
  "affiliate",
  "saas",
  "leadgen",
  "newsletter",
  "ecommerce",
  "blog",
  "membership",
  "agency",
  "custom",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_ORIGINS = ["built", "imported"] as const;
export type BusinessOrigin = (typeof BUSINESS_ORIGINS)[number];

export const BUSINESS_STATUSES = ["active", "paused", "archived"] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  businessType: text("business_type").notNull().default("custom"),
  // Business Type Registry key (built-in or custom_business_types.key); null = businessType.
  typeKey: text("type_key"),
  revenueModel: text("revenue_model"),
  websiteUrl: text("website_url"),
  origin: text("origin").notNull().default("imported"),
  status: text("status").notNull().default("active"),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  clientWorkspaceId: integer("client_workspace_id").references(() => clientWorkspacesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("businesses_owner_id_idx").on(t.ownerId),
  index("businesses_owner_id_origin_idx").on(t.ownerId, t.origin),
  index("businesses_system_instance_id_idx").on(t.systemInstanceId),
  index("businesses_client_workspace_id_idx").on(t.clientWorkspaceId),
]);

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
