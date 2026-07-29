import { eq } from "drizzle-orm";
import { ashKnowledgeEntriesTable, type AshKnowledgeEntry } from "@workspace/db";
import type { DbExecutor } from "../../business-intelligence/events";
import type { GovernedWriteContext } from "../types";
import { recordAudit } from "../audit";
import { diffChanges, stampCreate, stampUpdate, type GovernanceManagedKeys } from "./helpers";

// This table has no projectScopeColumn() (its own `sourceProjectId` already
// covers the project dimension — see the schema file), so no extra reserved
// key beyond the shared governance-managed set.
export type NewKnowledgeEntry = Omit<typeof ashKnowledgeEntriesTable.$inferInsert, GovernanceManagedKeys>;

// ─── ash_knowledge_entries (Knowledge sub-engine) ──────────────────────────
export async function insertKnowledgeEntry(tx: DbExecutor, ctx: GovernedWriteContext, values: NewKnowledgeEntry): Promise<AshKnowledgeEntry> {
  const [entry] = await tx.insert(ashKnowledgeEntriesTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "ash_knowledge_entries", recordId: entry!.id, action: "create", changes: { after: values } });
  return entry!;
}

export async function updateKnowledgeEntry(
  tx: DbExecutor,
  ctx: GovernedWriteContext,
  before: AshKnowledgeEntry,
  values: Partial<NewKnowledgeEntry>,
): Promise<AshKnowledgeEntry> {
  const [entry] = await tx
    .update(ashKnowledgeEntriesTable)
    .set({ ...values, ...stampUpdate(ctx) })
    .where(eq(ashKnowledgeEntriesTable.id, before.id))
    .returning();
  await recordAudit(tx, ctx, { recordTable: "ash_knowledge_entries", recordId: entry!.id, action: "update", changes: diffChanges(before, values) });
  return entry!;
}

// Deliberately audit-EXEMPT — same rationale as touchBusinessMemoryAccess.
export async function touchKnowledgeEntryAccess(tx: DbExecutor, id: number): Promise<void> {
  await tx.update(ashKnowledgeEntriesTable).set({ lastAccessedAt: new Date() }).where(eq(ashKnowledgeEntriesTable.id, id));
}
