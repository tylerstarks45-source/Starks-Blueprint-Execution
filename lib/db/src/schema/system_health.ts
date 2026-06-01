import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemHealthTable = pgTable("system_health", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  status: text("status").notNull().default("healthy"),
  message: text("message"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSystemHealthSchema = createInsertSchema(systemHealthTable).omit({ id: true, checkedAt: true });
export type InsertSystemHealth = z.infer<typeof insertSystemHealthSchema>;
export type SystemHealth = typeof systemHealthTable.$inferSelect;
