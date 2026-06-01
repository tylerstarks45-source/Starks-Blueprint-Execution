import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildSessionsTable } from "./build_sessions";

export const buildOutputsTable = pgTable("build_outputs", {
  id: serial("id").primaryKey(),
  buildSessionId: integer("build_session_id").notNull().references(() => buildSessionsTable.id),
  outputType: text("output_type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuildOutputSchema = createInsertSchema(buildOutputsTable).omit({ id: true, createdAt: true });
export type InsertBuildOutput = z.infer<typeof insertBuildOutputSchema>;
export type BuildOutput = typeof buildOutputsTable.$inferSelect;
