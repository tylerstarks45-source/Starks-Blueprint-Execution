// ─── Build 019: Decision Intelligence — Executive Brain Bridge ───────────────
//
// EB reads DecisionSummary; Decision Intelligence NEVER owns EB state.
// Fail-open: any error returns null and never blocks the EB request path.

import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { fetchDecisionSummaryForEB, runDecisionIntelligence } from "../decision-intelligence/decision-orchestrator";
import type { DecisionSummary } from "../decision-intelligence/types";

export type { DecisionSummary };

const DECISION_RUN_EVERY_N_CYCLES = 70;
let cycleCount = 0;

async function getPrimaryBusinessId(userId: number): Promise<number | null> {
  try {
    const rows = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, userId))
      .limit(1);
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchDecisionSummary(userId: number): Promise<DecisionSummary | null> {
  try {
    const businessId = await getPrimaryBusinessId(userId);
    if (!businessId) return null;
    return fetchDecisionSummaryForEB(businessId);
  } catch {
    return null;
  }
}

export function triggerDecisionRun(userId: number, businessId: number): void {
  cycleCount++;
  if (cycleCount % DECISION_RUN_EVERY_N_CYCLES !== 0) return;

  // Fire-and-forget — failure must never surface to the EB request path
  runDecisionIntelligence(businessId, userId).catch(() => { /* intentionally swallowed */ });
}

export function buildDecisionAdvisory(summary: DecisionSummary | null): string | null {
  if (!summary) return null;

  const type = summary.primaryScenarioType.replace(/_/g, " ");
  const score = (summary.primarySelectionScore * 100).toFixed(0);
  const conf  = (summary.primaryConfidence * 100).toFixed(0);
  const alts  = summary.alternativeCount;

  return (
    `[Decision Intelligence] Primary decision: '${type}' (selection ${score}%, confidence ${conf}%). ` +
    `${alts} alternative${alts !== 1 ? "s" : ""} on record. ` +
    `${summary.topTradeoffSummary}`
  );
}
