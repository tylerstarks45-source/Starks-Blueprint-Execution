import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { adminUsersTable } from "./admin_users";

export const adminActivityTable = pgTable("admin_activity", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsersTable.id),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdminActivitySchema = createInsertSchema(adminActivityTable).omit({ id: true, createdAt: true });
export type InsertAdminActivity = z.infer<typeof insertAdminActivitySchema>;
export type AdminActivity = typeof adminActivityTable.$inferSelect;
