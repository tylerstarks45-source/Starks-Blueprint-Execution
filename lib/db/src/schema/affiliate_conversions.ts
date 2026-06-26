import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { userAffiliateLinksTable } from "./user_affiliate_links";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const affiliateConversionsTable = pgTable("affiliate_conversions", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").notNull().references(() => userAffiliateLinksTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  orderId: text("order_id"),
  referringUrl: text("referring_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("affiliate_conversions_link_id_idx").on(t.linkId),
  index("affiliate_conversions_user_id_idx").on(t.userId),
  index("affiliate_conversions_system_instance_id_idx").on(t.systemInstanceId),
]);

export type AffiliateConversion = typeof affiliateConversionsTable.$inferSelect;
export type InsertAffiliateConversion = typeof affiliateConversionsTable.$inferInsert;
