import { pgTable, serial, text, boolean, integer, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  role: text("role").default("USER"),
  membershipStatus: text("membership_status").notNull().default("inactive"),
  membershipTier: text("membership_tier"),
  creditsBalance: integer("credits_balance").notNull().default(0),
  walletBalance: integer("wallet_balance").notNull().default(0),
  active: boolean("active").notNull().default(true),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifyToken: text("email_verify_token"),
  emailVerifyExpiry: timestamp("email_verify_expiry", { withTimezone: true }),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingChecklistDismissed: boolean("onboarding_checklist_dismissed").notNull().default(false),
  milestonesReached: jsonb("milestones_reached").$type<Array<{ amount: number; reachedAt: string }>>().default([]),
  socialProofConsent: boolean("social_proof_consent").notNull().default(false),
  notifyRevenue: boolean("notify_revenue").notNull().default(true),
  notifyMilestone: boolean("notify_milestone").notNull().default(true),
  notifyBuild: boolean("notify_build").notNull().default(true),
  notifyPlatform: boolean("notify_platform").notNull().default(false),
  expoPushToken: text("expo_push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  // Defense-in-depth: the app already normalizes email to lowercase/trimmed
  // before every lookup/insert (auth.ts), but this DB-level index guarantees
  // two accounts can never collide by case (e.g. "User@x.com" vs "user@x.com")
  // even if a future code path forgets to normalize.
  uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
