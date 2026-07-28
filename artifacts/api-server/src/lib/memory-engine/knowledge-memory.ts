import { db, ashKnowledgeEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AshKnowledgeEntry, AshKnowledgeCategory } from "@workspace/db";
import { topByRelevance } from "./relevance";

// ─── Knowledge Memory (Layer 5) ────────────────────────────────────────────
// Per-user patterns/playbooks/recommendations, continuously captured (see
// auto-memory.ts) and specifically written to on project completion (see
// learning.ts). Distinct from the existing cross-user `ash_lessons` table.

export async function getRelevantKnowledge(params: {
  userId: number;
  message: string;
  limit?: number;
}): Promise<AshKnowledgeEntry[]> {
  const rows = await db.select().from(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, params.userId));
  const top = topByRelevance(rows, params.message, (r) => ({
    content: `${r.title} ${r.content}`,
    tags: r.tags,
    importanceScore: r.importanceScore,
    confidenceScore: r.confidenceScore,
    lastAccessedAt: r.lastAccessedAt,
  }), params.limit ?? 3);

  for (const row of top) {
    await db.update(ashKnowledgeEntriesTable).set({ lastAccessedAt: new Date() }).where(eq(ashKnowledgeEntriesTable.id, row.id)).catch(() => {});
  }
  return top;
}

export async function addKnowledgeEntry(params: {
  userId: number;
  sourceProjectId?: number | null;
  category: AshKnowledgeCategory;
  title: string;
  content: string;
  tags?: string[];
  importanceScore?: number;
  confidenceScore?: number;
}): Promise<AshKnowledgeEntry> {
  const [row] = await db.insert(ashKnowledgeEntriesTable).values({
    userId: params.userId,
    sourceProjectId: params.sourceProjectId ?? null,
    category: params.category,
    title: params.title,
    content: params.content,
    tags: params.tags ?? [],
    importanceScore: params.importanceScore ?? 50,
    confidenceScore: params.confidenceScore ?? 100,
    lastAccessedAt: new Date(),
  }).returning();
  return row;
}

export async function listKnowledge(userId: number): Promise<AshKnowledgeEntry[]> {
  return db.select().from(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, userId));
}
