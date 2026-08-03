import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { customerLifecycle, customerRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { LifecycleStage } from "./types.js";

const STAGE_ORDER: LifecycleStage[] = ["lead", "prospect", "opportunity", "customer", "advocate", "inactive", "archived"];

export async function initLifecycle(customerId: string, userId: number, businessId?: number) {
  const lifecycleId = `lc_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(customerLifecycle).values({
    lifecycleId,
    customerId,
    userId,
    businessId: businessId ?? null,
    currentStage: "lead",
    stageHistory: [{ stage: "lead", enteredAt: new Date().toISOString(), trigger: "creation" }],
    triggeredBy: "automated",
  }).returning()) as any[];
  return rows[0];
}

export async function advanceLifecycle(
  customerId: string,
  newStage: LifecycleStage,
  options: { triggeredBy?: string; wonReason?: string; lostReason?: string; notes?: string } = {}
) {
  const existing = await db.select().from(customerLifecycle)
    .where(eq(customerLifecycle.customerId, customerId))
    .orderBy(sql`created_at DESC`).limit(1);

  const prev = existing[0];
  const lifecycleId = `lc_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  const history: any[] = prev
    ? [...((prev.stageHistory as any[]) ?? []), {
        stage:       prev.currentStage,
        enteredAt:   prev.enteredStageAt?.toISOString() ?? new Date().toISOString(),
        exitedAt:    new Date().toISOString(),
        trigger:     options.triggeredBy ?? "manual",
      }]
    : [];

  const rows = (await db.insert(customerLifecycle).values({
    lifecycleId,
    customerId,
    userId:           prev?.userId ?? 0,
    businessId:       prev?.businessId ?? null,
    currentStage:     newStage,
    previousStage:    prev?.currentStage ?? null,
    stageHistory:     history,
    triggeredBy:      options.triggeredBy ?? "manual",
    wonReason:        options.wonReason ?? null,
    lostReason:       options.lostReason ?? null,
    notes:            options.notes ?? null,
    conversionScore:  stageConversionScore(newStage),
  }).returning()) as any[];

  // Update registry
  await db.execute(sql`
    UPDATE customer_registry
       SET current_stage = ${newStage},
           updated_at    = NOW()
     WHERE customer_id = ${customerId}
  `);

  return rows[0];
}

export async function getLifecycle(customerId: string) {
  return db.select().from(customerLifecycle)
    .where(eq(customerLifecycle.customerId, customerId))
    .orderBy(sql`created_at DESC`).limit(1);
}

export async function getLifecycleSummary(userId: number, businessId?: number) {
  const conditions = [`user_id = ${userId}`];
  if (businessId) conditions.push(`business_id = ${businessId}`);

  const result = await db.execute(sql`
    SELECT current_stage, COUNT(*) AS cnt
      FROM customer_lifecycle
     WHERE ${sql.raw(conditions.join(" AND "))}
     GROUP BY current_stage
  `);
  const breakdown: Record<string, number> = {};
  for (const row of (result as any).rows ?? []) {
    breakdown[row.current_stage] = Number(row.cnt);
  }
  return breakdown;
}

function stageConversionScore(stage: LifecycleStage): number {
  const scores: Record<LifecycleStage, number> = {
    lead: 10, prospect: 30, opportunity: 55, customer: 80,
    advocate: 95, inactive: 15, archived: 0,
  };
  return scores[stage] ?? 0;
}
