import {
  businessHealthMetricsTable,
  businessHealthScoresTable,
  type BusinessHealthMetric,
  type BusinessHealthScore,
} from "@workspace/db";
import type { DbExecutor } from "../../business-intelligence/events";
import type { GovernedWriteContext } from "../types";
import { recordAudit } from "../audit";
import { stampCreate, type GovernanceManagedKeys } from "./helpers";

type ReservedKeys = GovernanceManagedKeys | "projectId";
export type NewBusinessHealthMetric = Omit<typeof businessHealthMetricsTable.$inferInsert, ReservedKeys>;
export type NewBusinessHealthScore = Omit<typeof businessHealthScoresTable.$inferInsert, ReservedKeys>;

// ─── business_health_metrics — heuristic continuous-monitoring snapshots ───
// Append-only: each scheduler/event-triggered recompute inserts a fresh row,
// never updates a prior one (health-monitor.ts reads the latest by
// computedAt). Kept architecturally distinct from business_health_scores
// below — see monitoring-vs-ai-health note in project memory.
export async function insertHealthMetric(tx: DbExecutor, ctx: GovernedWriteContext, values: NewBusinessHealthMetric): Promise<BusinessHealthMetric> {
  const [metric] = await tx.insert(businessHealthMetricsTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_health_metrics", recordId: metric!.id, action: "create", changes: { after: values } });
  return metric!;
}

// ─── business_health_scores — AI-narrated health analysis ─────────────────
// Also append-only (one row per analysis run).
export async function insertHealthScore(tx: DbExecutor, ctx: GovernedWriteContext, values: NewBusinessHealthScore): Promise<BusinessHealthScore> {
  const [score] = await tx.insert(businessHealthScoresTable).values({ ...values, ...stampCreate(ctx) }).returning();
  await recordAudit(tx, ctx, { recordTable: "business_health_scores", recordId: score!.id, action: "create", changes: { after: values } });
  return score!;
}
