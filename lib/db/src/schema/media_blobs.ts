import { pgTable, serial, text, integer, timestamp, index, customType } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

// Generated media bytes (OpenRouter returns images as base64, not hosted URLs).
// Served publicly at /api/media/blob/:token so social platforms and <img> tags can fetch them;
// the 128-bit random token is the access control.
export const mediaBlobsTable = pgTable("media_blobs", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("media_blobs_user_id_idx").on(t.userId)]);

export type MediaBlob = typeof mediaBlobsTable.$inferSelect;
