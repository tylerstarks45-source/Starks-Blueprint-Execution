import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { userCredentialsTable } from "./user_credentials";

export const BUSINESS_CONNECTION_TYPES = [
  "social",
  "email_provider",
  "payment_processor",
  "crm",
  "analytics",
  "ads",
  "hosting",
  "ecommerce_platform",
  "other",
] as const;
export type BusinessConnectionType = (typeof BUSINESS_CONNECTION_TYPES)[number];

export const businessConnectionsTable = pgTable("business_connections", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  connectionType: text("connection_type").notNull().default("other"),
  platformName: text("platform_name").notNull(),
  // Points at an existing user_credentials row rather than storing secrets again.
  userCredentialId: integer("user_credential_id").references(() => userCredentialsTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("business_connections_business_id_idx").on(t.businessId),
  index("business_connections_user_credential_id_idx").on(t.userCredentialId),
]);

export const insertBusinessConnectionSchema = createInsertSchema(businessConnectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusinessConnection = z.infer<typeof insertBusinessConnectionSchema>;
export type BusinessConnection = typeof businessConnectionsTable.$inferSelect;
