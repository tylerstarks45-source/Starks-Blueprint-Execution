import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const processedStripeEventsTable = pgTable("processed_stripe_events", {
  eventId: text("event_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProcessedStripeEvent = typeof processedStripeEventsTable.$inferSelect;
