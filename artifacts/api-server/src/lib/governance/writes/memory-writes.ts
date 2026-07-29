import { eq } from "drizzle-orm";
import { businessMemoryTable, type BusinessMemory } from "@workspace/db";
import type { DbExecutor } from "../../business-intelligence/events";
import type { GovernedWriteContext } from "../types";
import { recordAudit } from "../audit";
import { diffChanges, stampCreate, stampUpdate, type GovernanceManagedKeys } from "./helpers";

type ReservedKeys = GovernanceManagedKeys | "projectId";
export type NewBusinessMemory = Omit<typeof businessMemoryTable.$inferInsert, ReservedKeys>;

// ─── business_memory (Memory sub-engine) ───────────────────────────────────
export async function insertBusinessMemory(tx: DbExecutor, ctx: GovernedWriteContext, values: NewBusinessMemory): Promise<BusinessMemory> {
  const [memory] = await tx.insert(businessMemoryTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_memory", recordId: memory!.id, action: "create", changes: { after: values } });
  return memory!;
}

export async function updateBusinessMemory(
  tx: DbExecutor,
  ctx: GovernedWriteContext,
  before: BusinessMemory,
  values: Partial<NewBusinessMemory>,
): Promise<BusinessMemory> {
  const [memory] = await tx
    .update(businessMemoryTable)
    .set({ ...values, ...stampUpdate(ctx) })
    .where(eq(businessMemoryTable.id, before.id))
    .returning();
  await recordAudit(tx, ctx, { recordTable: "business_memory", recordId: memory!.id, action: "update", changes: diffChanges(before, values) });
  return memory!;
}

// Deliberately audit-EXEMPT: bumping `lastAccessedAt` is a freshness touch,
// not new information about the business, so it must never create audit
// noise. This is the one sanctioned way to update it — call sites must never
// reach for a raw tx.update(businessMemoryTable) to do this instead.
export async function touchBusinessMemoryAccess(tx: DbExecutor, id: number): Promise<void> {
  await tx.update(businessMemoryTable).set({ lastAccessedAt: new Date() }).where(eq(businessMemoryTable.id, id));
}
