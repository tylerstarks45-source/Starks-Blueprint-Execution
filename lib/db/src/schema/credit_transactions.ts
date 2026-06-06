import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  type: text("type").notNull(),
  reason: text("reason"),
  model: text("model"),
  tokens: integer("tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("credit_transactions_user_id_idx").on(t.userId),
  index("credit_transactions_created_at_idx").on(t.createdAt),
]);

export const insertCreditTransactionSchema = createInsertSchema(creditTransactionsTable).omit({ id: true, createdAt: true });
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
