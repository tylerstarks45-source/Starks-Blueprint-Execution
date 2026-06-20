import { pgTable, serial, text, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blueprintsTable } from "./blueprints";
import { usersTable } from "./users";

export const blueprintReviewsTable = pgTable("blueprint_reviews", {
  id: serial("id").primaryKey(),
  blueprintId: integer("blueprint_id").notNull().references(() => blueprintsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("blueprint_reviews_blueprint_id_idx").on(t.blueprintId),
  index("blueprint_reviews_user_id_idx").on(t.userId),
  unique("blueprint_reviews_blueprint_user_unique").on(t.blueprintId, t.userId),
]);

export const insertBlueprintReviewSchema = createInsertSchema(blueprintReviewsTable).omit({ id: true, createdAt: true });
export type InsertBlueprintReview = z.infer<typeof insertBlueprintReviewSchema>;
export type BlueprintReview = typeof blueprintReviewsTable.$inferSelect;
