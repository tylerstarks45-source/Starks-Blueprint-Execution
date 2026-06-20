import { pgTable, serial, text, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { abTestsTable } from "./ab_tests";

export const abVariantsTable = pgTable("ab_variants", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => abTestsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Public URL slug for this variant (null for the control, set for treatments). */
  slug: text("slug"),
  /** 'active' while test runs; 'archived' for non-winners after conclusion. */
  status: text("status").notNull().default("active"),
  contentRef: text("content_ref").notNull().default(""),
  visits: integer("visits").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  conversionEvents: jsonb("conversion_events").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ab_variants_test_id_idx").on(t.testId),
  uniqueIndex("ab_variants_slug_idx").on(t.slug),
]);

export type AbVariant = typeof abVariantsTable.$inferSelect;
export type InsertAbVariant = typeof abVariantsTable.$inferInsert;
