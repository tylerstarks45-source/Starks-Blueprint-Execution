import { db, ashProjectMemoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AshProjectMemory, AshProjectMemoryType } from "@workspace/db";
import { topByRelevance } from "./relevance";

// ─── Project Memory (Layer 3) ──────────────────────────────────────────────

export async function getRelevantProjectMemory(params: {
  projectId: number;
  message: string;
  limit?: number;
}): Promise<AshProjectMemory[]> {
  const rows = await db.select().from(ashProjectMemoryTable).where(eq(ashProjectMemoryTable.projectId, params.projectId));
  const top = topByRelevance(rows, params.message, (r) => ({
    content: `${r.title ?? ""} ${r.content}`,
    tags: r.tags,
    importanceScore: r.importanceScore,
    confidenceScore: r.confidenceScore,
    lastAccessedAt: r.lastAccessedAt,
  }), params.limit ?? 5);

  for (const row of top) {
    await db.update(ashProjectMemoryTable).set({ lastAccessedAt: new Date() }).where(eq(ashProjectMemoryTable.id, row.id)).catch(() => {});
  }
  return top;
}

export async function addProjectMemory(params: {
  projectId: number;
  type: AshProjectMemoryType;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  importanceScore?: number;
  confidenceScore?: number;
}): Promise<AshProjectMemory> {
  const [row] = await db.insert(ashProjectMemoryTable).values({
    projectId: params.projectId,
    type: params.type,
    title: params.title ?? null,
    content: params.content,
    metadata: params.metadata ?? {},
    tags: params.tags ?? [],
    importanceScore: params.importanceScore ?? 50,
    confidenceScore: params.confidenceScore ?? 100,
    lastAccessedAt: new Date(),
  }).returning();
  return row;
}

export async function listProjectMemory(projectId: number): Promise<AshProjectMemory[]> {
  return db.select().from(ashProjectMemoryTable).where(eq(ashProjectMemoryTable.projectId, projectId));
}
