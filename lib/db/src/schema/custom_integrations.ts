import { pgTable, serial, text, integer, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export interface CustomIntegrationAuth {
  type: "none" | "bearer" | "header" | "query";
  /** Header or query parameter name for "header" / "query". */
  name?: string;
  /** The owner's saved credential (user_credentials.credential_key) holding the secret. */
  credentialKey?: string;
}

export interface CustomIntegrationAction {
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Path under baseUrl; {param} placeholders are filled from call params. */
  path: string;
  description: string;
  /** Call params sent as query string. */
  query?: string[];
  /** Policy kind for ASH Control; defaults to connect_service for GET and publish otherwise. */
  kind?: "connect_service" | "publish" | "email_customers" | "spend" | "delete" | "build";
}

export interface CustomIntegrationTest {
  ok: boolean;
  action: string;
  status: number | null;
  detail: string;
  at: string;
}

// A declarative API integration ASH (or the owner) defines from a provider's docs. Only declared
// actions on the declared host can run; it must pass a read-only sandbox test and be approved by
// the owner before use. Editing it sends it back to draft.
export const customIntegrationsTable = pgTable("custom_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  docsUrl: text("docs_url"),
  baseUrl: text("base_url").notNull(),
  auth: jsonb("auth").$type<CustomIntegrationAuth>().notNull(),
  actions: jsonb("actions").$type<CustomIntegrationAction[]>().notNull(),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  lastTest: jsonb("last_test").$type<CustomIntegrationTest>(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("custom_integrations_user_key_idx").on(t.userId, t.key)]);

export type CustomIntegration = typeof customIntegrationsTable.$inferSelect;
