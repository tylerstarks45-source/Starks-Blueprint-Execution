import { eq } from "drizzle-orm";
import { businessRecommendationsTable, type BusinessRecommendation } from "@workspace/db";
import type { DbExecutor } from "../../business-intelligence/events";
import type { GovernedWriteContext } from "../types";
import { recordAudit } from "../audit";
import { diffChanges, stampCreate, stampUpdate, type GovernanceManagedKeys } from "./helpers";

type ReservedKeys = GovernanceManagedKeys | "projectId";
export type NewBusinessRecommendation = Omit<typeof businessRecommendationsTable.$inferInsert, ReservedKeys>;

// ─── business_recommendations (Recommendations sub-engine) ────────────────
export async function insertRecommendation(tx: DbExecutor, ctx: GovernedWriteContext, values: NewBusinessRecommendation): Promise<BusinessRecommendation> {
  const [recommendation] = await tx.insert(businessRecommendationsTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_recommendations", recordId: recommendation!.id, action: "create", changes: { after: values } });
  return recommendation!;
}

export async function updateRecommendation(
  tx: DbExecutor,
  ctx: GovernedWriteContext,
  before: BusinessRecommendation,
  values: Partial<NewBusinessRecommendation>,
): Promise<BusinessRecommendation> {
  const [recommendation] = await tx
    .update(businessRecommendationsTable)
    .set({ ...values, ...stampUpdate(ctx) })
    .where(eq(businessRecommendationsTable.id, before.id))
    .returning();
  await recordAudit(tx, ctx, {
    recordTable: "business_recommendations",
    recordId: recommendation!.id,
    action: "update",
    changes: diffChanges(before, values),
  });
  return recommendation!;
}
