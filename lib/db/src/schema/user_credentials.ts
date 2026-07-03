import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { toolsTable } from "./tools";
import { clientWorkspacesTable } from "./client_workspaces";
import { systemInstancesTable } from "./system_instances";

export const CONNECTION_STATUSES = [
  "connected",
  "disconnected",
  "expired",
  "needs_reconnect",
  "rate_limited",
  "invalid",
] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const userCredentialsTable = pgTable("user_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  toolId: integer("tool_id").references(() => toolsTable.id, { onDelete: "set null" }),
  credentialKey: text("credential_key").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  // Connection Hub metadata
  status: text("status").notNull().default("disconnected"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usageCount: integer("usage_count").notNull().default(0),
  // Optional JSON metadata (displayName, notes, customCategory, etc.)
  metadata: text("metadata"),
  clientWorkspaceId: integer("client_workspace_id").references(() => clientWorkspacesTable.id, { onDelete: "set null" }),
  // Optional per-system-instance scoping. NULL rows are shared, user-level
  // credentials (Connections Hub / OAuth). Rows scoped to a system instance are
  // that build's own copy of a connector's tokens, so building two systems of
  // the same type no longer overwrites each other's credentials.
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("user_credentials_user_id_idx").on(t.userId),
  index("user_credentials_user_id_key_idx").on(t.userId, t.credentialKey),
  index("user_credentials_client_workspace_id_idx").on(t.clientWorkspaceId),
  index("user_credentials_system_instance_id_idx").on(t.systemInstanceId),
]);

export const insertUserCredentialSchema = createInsertSchema(userCredentialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserCredential = z.infer<typeof insertUserCredentialSchema>;
export type UserCredential = typeof userCredentialsTable.$inferSelect;
