import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { toolsTable } from "./tools";

export const affiliateLinksTable = pgTable("affiliate_links", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").references(() => toolsTable.id),
  url: text("url").notNull(),
  campaign: text("campaign"),
  clickCount: integer("click_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAffiliateLinkSchema = createInsertSchema(affiliateLinksTable).omit({ id: true, clickCount: true, createdAt: true, updatedAt: true });
export type InsertAffiliateLink = z.infer<typeof insertAffiliateLinkSchema>;
export type AffiliateLink = typeof affiliateLinksTable.$inferSelect;
