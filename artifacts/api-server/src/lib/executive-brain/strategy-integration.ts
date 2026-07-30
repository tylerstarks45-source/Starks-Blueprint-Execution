// ─── Build 020: Executive Strategy — Executive Brain Bridge ──────────────────
//
// EB reads StrategySummary; Executive Strategy NEVER owns EB state.
// Fail-open: any error returns null and never blocks the EB request path.

import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { fetchStrategySummaryForEB, runStrategyEngine } from "../executive-strategy/strategy-orchestrator";
import type { StrategySummary } from "../executive-strategy/types";

export type { StrategySummary };

const STRATEGY_RUN_EVERY_N_CYCLES = 80;
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

export async function fetchStrategySummary(userId: number): Promise<StrategySummary | null> {
  try {
    const businessId = await getPrimaryBusinessId(userId);
    if (!businessId) return null;
    return fetchStrategySummaryForEB(businessId);
  } catch {
    return null;
  }
}

export function triggerStrategyRun(userId: number, businessId: number): void {
  cycleCount++;
  if (cycleCount % STRATEGY_RUN_EVERY_N_CYCLES !== 0) return;

  runStrategyEngine(businessId, userId).catch(() => { /* intentionally swallowed */ });
}

export function buildStrategyAdvisory(summary: StrategySummary | null): string | null {
  if (!summary) return null;

  const name     = summary.strategyName;
  const conf     = (summary.confidenceScore * 100).toFixed(0);
  const align    = (summary.alignmentScore * 100).toFixed(0);
  const pillars  = summary.topPillarTypes.map((p: string) => p.replace(/_/g, " ")).join(", ");
  const objCount = summary.objectiveCount;

  return (
    `[Executive Strategy] Active strategy: '${name}' (confidence ${conf}%, alignment ${align}%). ` +
    `Top pillars: ${pillars}. ` +
    `${objCount} strategic objective${objCount !== 1 ? "s" : ""} defined.`
  );
}
