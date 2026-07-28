import { db, userMemoryTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import type { UserMemory } from "@workspace/db";
import { topByRelevance } from "./relevance";

// ─── Long-Term Memory (Layer 2) ────────────────────────────────────────────
// Wraps the EXISTING `user_memory` table/rows. The manual CRUD routes
// (/api/user-memory) are untouched and keep writing memoryKey/memoryValue
// pairs exactly as before. This module adds the Phase 1.2 read/write paths
// used by the Memory Engine (auto-capture + relevance-ranked retrieval) on
// top of the same table.

export async function getRelevantLongTermMemory(params: {
  userId: number;
  message: string;
  limit?: number;
}): Promise<UserMemory[]> {
  const rows = await db.select().from(userMemoryTable).where(eq(userMemoryTable.userId, params.userId));
  const top = topByRelevance(rows, params.message, (r) => ({
    content: `${r.memoryKey}: ${r.memoryValue}`,
    tags: r.tags,
    importanceScore: r.importanceScore,
    confidenceScore: r.confidenceScore,
    lastAccessedAt: r.lastAccessedAt,
  }), params.limit ?? 5);

  if (top.length > 0) {
    const ids = top.map((r) => r.id);
    await db.update(userMemoryTable).set({ lastAccessedAt: new Date() }).where(
      // drizzle doesn't have a simple inArray import here without extra deps; loop is fine at this scale
      eq(userMemoryTable.id, ids[0]),
    ).catch(() => {});
    for (const id of ids.slice(1)) {
      await db.update(userMemoryTable).set({ lastAccessedAt: new Date() }).where(eq(userMemoryTable.id, id)).catch(() => {});
    }
  }

  return top;
}

// Auto-memory writer: upserts by (userId, category, normalized key derived
// from title) so repeated similar facts strengthen one row instead of
// spawning duplicates. Manual entries (category IS NULL) are never touched.
export async function upsertLongTermMemory(params: {
  userId: number;
  systemInstanceId?: number | null;
  category: string;
  title: string;
  content: string;
  tags: string[];
  importanceScore: number;
  confidenceScore: number;
}): Promise<void> {
  const memoryKey = `auto:${params.category}:${params.title.toLowerCase().slice(0, 60).replace(/\s+/g, "_")}`;

  const conditions = [eq(userMemoryTable.userId, params.userId), eq(userMemoryTable.memoryKey, memoryKey)];
  if (params.systemInstanceId != null) {
    conditions.push(eq(userMemoryTable.systemInstanceId, params.systemInstanceId));
  } else {
    conditions.push(isNull(userMemoryTable.systemInstanceId));
  }
  const [existing] = await db.select().from(userMemoryTable).where(and(...conditions));

  if (existing) {
    await db.update(userMemoryTable).set({
      memoryValue: params.content,
      category: params.category,
      tags: params.tags,
      importanceScore: Math.max(existing.importanceScore, params.importanceScore),
      confidenceScore: params.confidenceScore,
      lastAccessedAt: new Date(),
    }).where(eq(userMemoryTable.id, existing.id));
    return;
  }

  await db.insert(userMemoryTable).values({
    userId: params.userId,
    systemInstanceId: params.systemInstanceId ?? null,
    memoryKey,
    memoryValue: params.content,
    category: params.category,
    tags: params.tags,
    importanceScore: params.importanceScore,
    confidenceScore: params.confidenceScore,
    lastAccessedAt: new Date(),
  });
}
