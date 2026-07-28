import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";
import { businessesTable } from "./businesses";

// ─── ASH Brain v2.0 — Long-Term Memory (Phase 1.2) ─────────────────────────
// This table predates Phase 1.2 and is used as-is by existing manual
// key/value memory features (GET/POST/PUT/DELETE /api/user-memory, and the
// orchestrator's memoryNote injection) — those paths are untouched.
// Phase 1.2 EXTENDS it with memory-management metadata (category, importance,
// tags, confidence, last accessed) so the new Memory Engine can auto-write
// classified long-term memories here and rank/retrieve/clean them up, without
// changing the shape or meaning of the original memoryKey/memoryValue pair.
export const USER_MEMORY_CATEGORIES = [
  "preference",
  "business_knowledge",
  "learned_fact",
  "ai_preference",
  "general",
] as const;
export type UserMemoryCategory = (typeof USER_MEMORY_CATEGORIES)[number];

// ─── Business Context Isolation (Phase 1.5A) ───────────────────────────────
// Every memory record must carry a scope so retrieval can tell "applies
// everywhere for this user" apart from "only applies to one business" —
// without a scope, a fact learned while working on Business B could leak
// into a conversation about Business A. `global_user` is the default so
// pre-existing rows and manual /api/user-memory writes (which never set a
// business) keep behaving exactly as before: visible everywhere for that
// user, which is correct for genuine user-level preferences.
export const MEMORY_SCOPES = ["global_user", "business", "project", "session", "conversation"] as const;
export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export const userMemoryTable = pgTable("user_memory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  memoryKey: text("memory_key").notNull(),
  memoryValue: text("memory_value").notNull(),
  // Nullable/defaulted additions (Phase 1.2) — existing rows and callers that
  // never set these keep working unchanged.
  category: text("category"),
  importanceScore: integer("importance_score").notNull().default(50),
  tags: jsonb("tags").notNull().default([]),
  confidenceScore: integer("confidence_score").notNull().default(100),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  // Phase 1.5A additions — Business Context Isolation. Additive/defaulted:
  // existing rows read back as scope='global_user', businessId=null (unchanged behavior).
  scope: text("scope").notNull().default("global_user"),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("user_memory_user_id_idx").on(t.userId),
  index("user_memory_user_id_category_idx").on(t.userId, t.category),
  index("user_memory_business_id_idx").on(t.businessId),
]);

export const insertUserMemorySchema = createInsertSchema(userMemoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;
export type UserMemory = typeof userMemoryTable.$inferSelect;
