import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const whiteLabelConfigsTable = pgTable("white_label_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  brandName: text("brand_name").notNull().default(""),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#1A8CFF"),
  accentColor: text("accent_color").notNull().default("#00E5E5"),
  customDomain: text("custom_domain").unique(),
  domainVerified: boolean("domain_verified").notNull().default(false),
  domainVerifiedAt: timestamp("domain_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("white_label_configs_user_id_idx").on(t.userId),
  index("white_label_configs_custom_domain_idx").on(t.customDomain),
]);

export const insertWhiteLabelConfigSchema = createInsertSchema(whiteLabelConfigsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhiteLabelConfig = z.infer<typeof insertWhiteLabelConfigSchema>;
export type WhiteLabelConfig = typeof whiteLabelConfigsTable.$inferSelect;
