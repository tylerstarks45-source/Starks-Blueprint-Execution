import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { landingPagesTable } from "./landing_pages";

// Short-lived, single-use exchange codes for opening an unpublished landing
// page preview in a new browser tab without ever putting the user's real auth
// JWT in a URL. A row is consumed (deleted) the moment it's read once, and is
// otherwise garbage-collected once expired. Backed by Postgres (not an
// in-process Map) so the mint (POST .../preview-session) and consume
// (GET .../preview-html) requests work correctly even if they land on
// different API server instances or the server restarts in between.
export const landingPagePreviewSessionsTable = pgTable("landing_page_preview_sessions", {
  id: serial("id").primaryKey(),
  previewToken: text("preview_token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  pageId: integer("page_id").notNull().references(() => landingPagesTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LandingPagePreviewSession = typeof landingPagePreviewSessionsTable.$inferSelect;
