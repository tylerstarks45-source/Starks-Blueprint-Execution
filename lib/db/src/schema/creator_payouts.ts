import { pgTable, serial, integer, text, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { blueprintsTable } from "./blueprints";

/** A creator's Stripe Connect (Express) account used to receive marketplace payouts. */
export const creatorPayoutAccountsTable = pgTable("creator_payout_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  stripeAccountId: text("stripe_account_id").notNull(),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  detailsSubmitted: boolean("details_submitted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("creator_payout_accounts_user_uq").on(t.userId),
  uniqueIndex("creator_payout_accounts_stripe_uq").on(t.stripeAccountId),
]);

export const CREATOR_EARNING_STATUSES = ["pending", "available", "paid", "reversed"] as const;
export type CreatorEarningStatus = (typeof CREATOR_EARNING_STATUSES)[number];

/**
 * Real-money creator earnings from card sales (cents). Held as "pending" until the refund
 * window passes, then "available" for payout. Negative rows claw back already-paid sales
 * that were later refunded or charged back.
 */
export const creatorEarningsTable = pgTable("creator_earnings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blueprintId: integer("blueprint_id").references(() => blueprintsTable.id, { onDelete: "set null" }),
  buyerUserId: integer("buyer_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  paymentRef: text("payment_ref"),
  grossCents: integer("gross_cents").notNull().default(0),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").$type<CreatorEarningStatus>().notNull().default("pending"),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
  payoutId: integer("payout_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("creator_earnings_user_status_idx").on(t.userId, t.status),
  index("creator_earnings_payment_ref_idx").on(t.paymentRef),
]);

export const CREATOR_PAYOUT_STATUSES = ["processing", "paid", "failed"] as const;
export type CreatorPayoutStatus = (typeof CREATOR_PAYOUT_STATUSES)[number];

export const creatorPayoutsTable = pgTable("creator_payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").$type<CreatorPayoutStatus>().notNull().default("processing"),
  stripeTransferId: text("stripe_transfer_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [index("creator_payouts_user_idx").on(t.userId)]);

export type CreatorEarning = typeof creatorEarningsTable.$inferSelect;
export type CreatorPayout = typeof creatorPayoutsTable.$inferSelect;
