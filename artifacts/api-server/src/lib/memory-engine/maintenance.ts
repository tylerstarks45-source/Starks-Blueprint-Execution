import { db, userMemoryTable, ashProjectMemoryTable, ashKnowledgeEntriesTable } from "@workspace/db";
import { lt, and, isNotNull, sql } from "drizzle-orm";
import { logger } from "../logger";
import { updateKnowledgeEntry } from "../governance/writes/knowledge-writes";
import { actorFor, type GovernedWriteContext } from "../governance/types";

// ─── Memory Management: cleanup, duplicate detection, compression ─────────
// Runs periodically from scheduler.ts (module-level lastRun guard, same
// pattern as the existing weekly-digest/A-B-test-conclusion jobs). Every step
// is additive-safe: it only deletes rows that are low-value AND stale, and
// only merges near-duplicate content — it never touches manually-created
// user_memory rows (category IS NULL), since those are the pre-existing
// user-facing feature and must behave exactly as before.

const STALE_DAYS = 120;
const LOW_IMPORTANCE_THRESHOLD = 25;

export async function runMemoryMaintenance(): Promise<{ cleaned: number; deduped: number; compressed: number }> {
  const cleaned = await cleanupLowValueMemory();
  const deduped = await deduplicateMemory();
  const compressed = await compressVerboseMemory();
  logger.info({ cleaned, deduped, compressed }, "Memory Engine: maintenance sweep complete");
  return { cleaned, deduped, compressed };
}

// Automatic cleanup: auto-captured (category IS NOT NULL) memory that is both
// low-importance and hasn't been accessed in a long time is pruned so memory
// doesn't grow unbounded with noise.
async function cleanupLowValueMemory(): Promise<number> {
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const deletedUserMemory = await db
    .delete(userMemoryTable)
    .where(and(
      isNotNull(userMemoryTable.category),
      lt(userMemoryTable.importanceScore, LOW_IMPORTANCE_THRESHOLD),
      lt(userMemoryTable.updatedAt, staleCutoff),
    ))
    .returning({ id: userMemoryTable.id });

  const deletedProjectMemory = await db
    .delete(ashProjectMemoryTable)
    .where(and(
      lt(ashProjectMemoryTable.importanceScore, LOW_IMPORTANCE_THRESHOLD),
      lt(ashProjectMemoryTable.updatedAt, staleCutoff),
    ))
    .returning({ id: ashProjectMemoryTable.id });

  return deletedUserMemory.length + deletedProjectMemory.length;
}

// Duplicate detection: collapse rows sharing the same (userId, category,
// memoryKey) — can happen if the auto-memory key derivation ever races —
// keeping the most recently updated row and summing nothing (importance is
// already max()'d at write time in upsertLongTermMemory; this is a safety
// net for any other write path).
async function deduplicateMemory(): Promise<number> {
  const rows = await db.execute(sql`
    SELECT id, user_id, memory_key,
           ROW_NUMBER() OVER (PARTITION BY user_id, memory_key ORDER BY updated_at DESC) AS rn
    FROM user_memory
    WHERE category IS NOT NULL
  `);
  const duplicateIds = (rows.rows as Array<{ id: number; rn: number }>)
    .filter((r) => Number(r.rn) > 1)
    .map((r) => r.id);
  if (duplicateIds.length === 0) return 0;
  await db.execute(sql`DELETE FROM user_memory WHERE id = ANY(${duplicateIds})`);
  return duplicateIds.length;
}

// Compression: very long auto-captured content is summarized down to a hard
// cap so retrieval keeps injecting compact context rather than letting any
// one memory dominate the prompt budget. Simple truncation-with-ellipsis is
// intentional here (cheap, deterministic, no extra AI cost for a maintenance
// sweep) — AI-based summarization is reserved for the completion-learning
// path where quality matters more than cost.
const MAX_CONTENT_LENGTH = 600;

async function compressVerboseMemory(): Promise<number> {
  let compressed = 0;

  const longUserMemory = await db.select({ id: userMemoryTable.id, memoryValue: userMemoryTable.memoryValue })
    .from(userMemoryTable)
    .where(and(isNotNull(userMemoryTable.category), sql`length(${userMemoryTable.memoryValue}) > ${MAX_CONTENT_LENGTH}`));
  for (const row of longUserMemory) {
    await db.update(userMemoryTable)
      .set({ memoryValue: row.memoryValue.slice(0, MAX_CONTENT_LENGTH) + "…" })
      .where(sql`${userMemoryTable.id} = ${row.id}`);
    compressed++;
  }

  // Full rows (not a narrow column projection) so updateKnowledgeEntry has a
  // real `before` snapshot for its audit diff.
  const longKnowledge = await db.select()
    .from(ashKnowledgeEntriesTable)
    .where(sql`length(${ashKnowledgeEntriesTable.content}) > ${MAX_CONTENT_LENGTH}`);
  for (const row of longKnowledge) {
    // Scheduled sweep, no acting user; ownerUserId is the entry's own userId
    // (see knowledge-memory.ts's addKnowledgeEntry for why no join is needed).
    const ctx: GovernedWriteContext = {
      ownerUserId: row.userId,
      sourceEngine: "business_intelligence.knowledge_maintenance",
      actor: actorFor("scheduler"),
      businessId: row.businessId,
    };
    await updateKnowledgeEntry(db, ctx, row, { content: row.content.slice(0, MAX_CONTENT_LENGTH) + "…" });
    compressed++;
  }

  return compressed;
}
