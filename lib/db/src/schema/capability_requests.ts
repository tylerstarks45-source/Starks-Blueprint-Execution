import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Something a plan or mission needs that ASH can't do yet: a service the owner must connect ("connect"),
// a step only the owner can take ("manual"), or a capability the platform doesn't have ("missing").
// Open requests resolve themselves once the capability becomes available.
export const capabilityRequestsTable = pgTable("capability_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  capability: text("capability").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("open"),
  planId: integer("plan_id"),
  missionId: integer("mission_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (t) => [index("capability_requests_user_idx").on(t.userId, t.status)]);

export type CapabilityRequest = typeof capabilityRequestsTable.$inferSelect;
