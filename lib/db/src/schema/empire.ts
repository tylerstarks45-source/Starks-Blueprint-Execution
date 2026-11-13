import { pgTable, serial, text, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { businessesTable } from "./businesses";
import { canonicalAssets } from "./unified_asset";

// User-defined business types. Built-in types live in code; a business points
// at either via businesses.type_key.
export const customBusinessTypesTable = pgTable("custom_business_types", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("custom"),
  streamTypes: jsonb("stream_types").$type<string[]>().notNull().default([]),
  assetClasses: jsonb("asset_classes").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("custom_business_types_owner_key_idx").on(t.ownerId, t.key),
]);

// Explicit owner authorization for an asset to be used by a business other
// than the one it belongs to.
export const assetBusinessSharesTable = pgTable("asset_business_shares", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  assetId: integer("asset_id").notNull().references(() => canonicalAssets.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("asset_business_shares_asset_business_idx").on(t.assetId, t.businessId),
  index("asset_business_shares_owner_idx").on(t.ownerId),
  index("asset_business_shares_business_idx").on(t.businessId),
]);

export type CustomBusinessType = typeof customBusinessTypesTable.$inferSelect;
