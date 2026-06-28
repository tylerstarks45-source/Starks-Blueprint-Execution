import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const emailListsTable = pgTable("email_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  sendgridListId: text("sendgrid_list_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("email_lists_user_id_idx").on(t.userId),
]);

export type EmailList = typeof emailListsTable.$inferSelect;
export type InsertEmailList = typeof emailListsTable.$inferInsert;

export const emailSubscribersTable = pgTable("email_subscribers", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => emailListsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  status: text("status").notNull().default("active"),
  tags: text("tags").array().notNull().default([]),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("email_subscribers_list_email_idx").on(t.listId, t.email),
  index("email_subscribers_list_id_idx").on(t.listId),
]);

export type EmailSubscriber = typeof emailSubscribersTable.$inferSelect;
export type InsertEmailSubscriber = typeof emailSubscribersTable.$inferInsert;

export const emailSequencesTable = pgTable("email_sequences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  listId: integer("list_id").references(() => emailListsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("email_sequences_user_id_idx").on(t.userId),
]);

export type EmailSequence = typeof emailSequencesTable.$inferSelect;
export type InsertEmailSequence = typeof emailSequencesTable.$inferInsert;

export const emailSequenceStepsTable = pgTable("email_sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => emailSequencesTable.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  delayDays: integer("delay_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("email_sequence_steps_sequence_id_idx").on(t.sequenceId),
]);

export type EmailSequenceStep = typeof emailSequenceStepsTable.$inferSelect;
export type InsertEmailSequenceStep = typeof emailSequenceStepsTable.$inferInsert;

// ── Email Deliveries ─────────────────────────────────────────────────────────
// One row per email sent (sequence step or campaign blast).
// status lifecycle: sent → delivered → (opened | clicked | bounced | unsubscribed | failed)

export const emailDeliveriesTable = pgTable("email_deliveries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subscriberId: integer("subscriber_id").references(() => emailSubscribersTable.id, { onDelete: "set null" }),
  sequenceId: integer("sequence_id").references(() => emailSequencesTable.id, { onDelete: "set null" }),
  stepId: integer("step_id").references(() => emailSequenceStepsTable.id, { onDelete: "set null" }),
  campaignId: integer("campaign_id"),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("sent"),
  messageId: text("message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
  bouncedAt: timestamp("bounced_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("email_deliveries_user_id_idx").on(t.userId),
  index("email_deliveries_sequence_id_idx").on(t.sequenceId),
  index("email_deliveries_campaign_id_idx").on(t.campaignId),
  index("email_deliveries_subscriber_id_idx").on(t.subscriberId),
  index("email_deliveries_message_id_idx").on(t.messageId),
]);

export type EmailDelivery = typeof emailDeliveriesTable.$inferSelect;
export type InsertEmailDelivery = typeof emailDeliveriesTable.$inferInsert;

// ── Email Campaigns ───────────────────────────────────────────────────────────
// A blast campaign sends a one-shot email to all active subscribers in a list.

export const emailCampaignsTable = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  listId: integer("list_id").references(() => emailListsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  fromName: text("from_name"),
  status: text("status").notNull().default("draft"),
  sentCount: integer("sent_count").notNull().default(0),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  bounceCount: integer("bounce_count").notNull().default(0),
  unsubscribeCount: integer("unsubscribe_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("email_campaigns_user_id_idx").on(t.userId),
]);

export type EmailCampaign = typeof emailCampaignsTable.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaignsTable.$inferInsert;
