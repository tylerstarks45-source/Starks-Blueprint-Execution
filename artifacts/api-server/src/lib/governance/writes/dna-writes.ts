import { eq } from "drizzle-orm";
import {
  businessDnaClaimsTable,
  businessDnaVersionsTable,
  businessDnaConflictsTable,
  businessReviewQueueTable,
  type BusinessDnaClaim,
  type BusinessDnaConflict,
  type BusinessReviewQueueItem,
} from "@workspace/db";
import type { DbExecutor } from "../../business-intelligence/events";
import type { GovernedWriteContext } from "../types";
import { recordAudit } from "../audit";
import { diffChanges, stampCreate, stampUpdate, type GovernanceManagedKeys } from "./helpers";

// `projectId` (from projectScopeColumn()) is a reserved Phase B extension
// point on these four tables, not a caller-supplied value in Phase A — so it
// is omitted here alongside the other governance-managed columns.
type ReservedKeys = GovernanceManagedKeys | "projectId";

export type NewDnaClaim = Omit<typeof businessDnaClaimsTable.$inferInsert, ReservedKeys>;
export type NewDnaVersion = Omit<typeof businessDnaVersionsTable.$inferInsert, ReservedKeys>;
export type NewDnaConflict = Omit<typeof businessDnaConflictsTable.$inferInsert, ReservedKeys>;
export type NewReviewQueueItem = Omit<typeof businessReviewQueueTable.$inferInsert, ReservedKeys>;

// ─── business_dna_claims ────────────────────────────────────────────────────
export async function insertDnaClaim(tx: DbExecutor, ctx: GovernedWriteContext, values: NewDnaClaim): Promise<BusinessDnaClaim> {
  const [claim] = await tx.insert(businessDnaClaimsTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_dna_claims", recordId: claim!.id, action: "create", changes: { after: values } });
  return claim!;
}

export async function updateDnaClaim(
  tx: DbExecutor,
  ctx: GovernedWriteContext,
  before: BusinessDnaClaim,
  values: Partial<NewDnaClaim>,
): Promise<BusinessDnaClaim> {
  const [claim] = await tx
    .update(businessDnaClaimsTable)
    .set({ ...values, ...stampUpdate(ctx) })
    .where(eq(businessDnaClaimsTable.id, before.id))
    .returning();
  await recordAudit(tx, ctx, { recordTable: "business_dna_claims", recordId: claim!.id, action: "update", changes: diffChanges(before, values) });
  return claim!;
}

// ─── business_dna_versions (immutable log — insert only) ───────────────────
export async function insertDnaVersion(tx: DbExecutor, ctx: GovernedWriteContext, values: NewDnaVersion): Promise<void> {
  const [version] = await tx
    .insert(businessDnaVersionsTable)
    .values({ ...values, ...stampCreate(ctx) })
    .returning({ id: businessDnaVersionsTable.id });
  await recordAudit(tx, ctx, { recordTable: "business_dna_versions", recordId: version!.id, action: "create", changes: { after: values } });
}

// ─── business_dna_conflicts ─────────────────────────────────────────────────
export async function insertDnaConflict(tx: DbExecutor, ctx: GovernedWriteContext, values: NewDnaConflict): Promise<BusinessDnaConflict> {
  const [conflict] = await tx.insert(businessDnaConflictsTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_dna_conflicts", recordId: conflict!.id, action: "create", changes: { after: values } });
  return conflict!;
}

export async function updateDnaConflict(
  tx: DbExecutor,
  ctx: GovernedWriteContext,
  before: BusinessDnaConflict,
  values: Partial<NewDnaConflict>,
): Promise<BusinessDnaConflict> {
  const [conflict] = await tx
    .update(businessDnaConflictsTable)
    .set({ ...values, ...stampUpdate(ctx) })
    .where(eq(businessDnaConflictsTable.id, before.id))
    .returning();
  await recordAudit(tx, ctx, { recordTable: "business_dna_conflicts", recordId: conflict!.id, action: "update", changes: diffChanges(before, values) });
  return conflict!;
}

// ─── business_review_queue ──────────────────────────────────────────────────
export async function insertReviewQueueItem(tx: DbExecutor, ctx: GovernedWriteContext, values: NewReviewQueueItem): Promise<BusinessReviewQueueItem> {
  const [item] = await tx.insert(businessReviewQueueTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_review_queue", recordId: item!.id, action: "create", changes: { after: values } });
  return item!;
}

export async function updateReviewQueueItem(
  tx: DbExecutor,
  ctx: GovernedWriteContext,
  before: BusinessReviewQueueItem,
  values: Partial<NewReviewQueueItem>,
): Promise<BusinessReviewQueueItem> {
  const [item] = await tx
    .update(businessReviewQueueTable)
    .set({ ...values, ...stampUpdate(ctx) })
    .where(eq(businessReviewQueueTable.id, before.id))
    .returning();
  await recordAudit(tx, ctx, { recordTable: "business_review_queue", recordId: item!.id, action: "update", changes: diffChanges(before, values) });
  return item!;
}
