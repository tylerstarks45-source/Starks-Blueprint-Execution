import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { toolsTable } from "./tools";

export const toolCredentialRequirementsTable = pgTable("tool_credential_requirements", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").notNull().references(() => toolsTable.id),
  credentialKey: text("credential_key").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(true),
  credentialType: text("credential_type").notNull().default("api_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertToolCredentialRequirementSchema = createInsertSchema(toolCredentialRequirementsTable).omit({ id: true, createdAt: true });
export type InsertToolCredentialRequirement = z.infer<typeof insertToolCredentialRequirementSchema>;
export type ToolCredentialRequirement = typeof toolCredentialRequirementsTable.$inferSelect;
