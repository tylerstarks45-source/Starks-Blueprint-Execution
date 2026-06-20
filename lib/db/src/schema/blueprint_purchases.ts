import { pgTable, serial, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blueprintsTable } from "./blueprints";
import { usersTable } from "./users";

export const blueprintPurchasesTable = pgTable("blueprint_purchases", {
  id: serial("id").primaryKey(),
  blueprintId: integer("blueprint_id").notNull().references(() => blueprintsTable.id, { onDelete: "cascade" }),
  buyerUserId: integer("buyer_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  authorUserId: integer("author_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  priceCredits: integer("price_credits").notNull().default(0),
  creatorShareCredits: integer("creator_share_credits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("blueprint_purchases_unique_buyer").on(t.blueprintId, t.buyerUserId),
  index("blueprint_purchases_blueprint_id_idx").on(t.blueprintId),
  index("blueprint_purchases_buyer_user_id_idx").on(t.buyerUserId),
  index("blueprint_purchases_author_user_id_idx").on(t.authorUserId),
]);

export const insertBlueprintPurchaseSchema = createInsertSchema(blueprintPurchasesTable).omit({ id: true, createdAt: true });
export type InsertBlueprintPurchase = z.infer<typeof insertBlueprintPurchaseSchema>;
export type BlueprintPurchase = typeof blueprintPurchasesTable.$inferSelect;
