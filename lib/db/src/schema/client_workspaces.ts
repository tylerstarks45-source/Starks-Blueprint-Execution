import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const clientWorkspacesTable = pgTable("client_workspaces", {
  id: serial("id").primaryKey(),
  agencyUserId: integer("agency_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  notes: text("notes"),
  portalToken: text("portal_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("client_workspaces_agency_user_id_idx").on(t.agencyUserId),
]);

export const insertClientWorkspaceSchema = createInsertSchema(clientWorkspacesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClientWorkspace = z.infer<typeof insertClientWorkspaceSchema>;
export type ClientWorkspace = typeof clientWorkspacesTable.$inferSelect;
