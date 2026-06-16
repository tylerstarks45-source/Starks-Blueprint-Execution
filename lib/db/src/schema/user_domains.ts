import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { landingPagesTable } from "./landing_pages";

export const userDomainsTable = pgTable("user_domains", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("pending"),
  namecheapOrderId: text("namecheap_order_id"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }),
  linkedPageId: integer("linked_page_id").references(() => landingPagesTable.id, { onDelete: "set null" }),
  dnsVerified: boolean("dns_verified").notNull().default(false),
  dnsVerifiedAt: timestamp("dns_verified_at", { withTimezone: true }),
  registrantFirstName: text("registrant_first_name"),
  registrantLastName: text("registrant_last_name"),
  registrantEmail: text("registrant_email"),
  registrantAddress1: text("registrant_address1"),
  registrantCity: text("registrant_city"),
  registrantStateProvince: text("registrant_state_province"),
  registrantPostalCode: text("registrant_postal_code"),
  registrantCountry: text("registrant_country").default("US"),
  registrantPhone: text("registrant_phone"),
  years: integer("years").notNull().default(1),
  price: text("price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("user_domains_domain_idx").on(t.domain),
  index("user_domains_user_id_idx").on(t.userId),
  index("user_domains_linked_page_id_idx").on(t.linkedPageId),
]);

export type UserDomain = typeof userDomainsTable.$inferSelect;
export type InsertUserDomain = typeof userDomainsTable.$inferInsert;
