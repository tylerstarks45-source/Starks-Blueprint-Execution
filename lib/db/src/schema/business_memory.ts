import { pgTable, serial, integer, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

// ─── ASH Brain v2.0 — Business Memory (Phase 1.2) ──────────────────────────
// One row per `businesses` record — the platform's evolving understanding of
// that business. Kept as its own table (not new columns on `businesses`) so
// the existing, widely-used businesses schema/queries stay untouched; this
// is purely additive and is only read/written by the Memory Engine and (in
// future phases) by whatever surfaces choose to show it.

export const businessMemoryTable = pgTable(
  "business_memory",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    businessModel: text("business_model"),
    products: jsonb("products").notNull().default([]),
    services: jsonb("services").notNull().default([]),
    customers: jsonb("customers").notNull().default([]),
    competitors: jsonb("competitors").notNull().default([]),
    revenueGoals: text("revenue_goals"),
    marketingStrategy: text("marketing_strategy"),
    seoStrategy: text("seo_strategy"),
    automationStrategy: text("automation_strategy"),
    importanceScore: integer("importance_score").notNull().default(50),
    tags: jsonb("tags").notNull().default([]),
    confidenceScore: integer("confidence_score").notNull().default(100),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("business_memory_business_id_idx").on(t.businessId),
  ],
);

export const insertBusinessMemorySchema = createInsertSchema(businessMemoryTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusinessMemory = z.infer<typeof insertBusinessMemorySchema>;
export type BusinessMemory = typeof businessMemoryTable.$inferSelect;
