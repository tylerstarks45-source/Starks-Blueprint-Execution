import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const encryptionKeyRotationsTable = pgTable("encryption_key_rotations", {
  id: serial("id").primaryKey(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }).notNull().defaultNow(),
  rotatedByAdminId: integer("rotated_by_admin_id").references(() => usersTable.id),
  notes: text("notes"),
});

export type EncryptionKeyRotation = typeof encryptionKeyRotationsTable.$inferSelect;
