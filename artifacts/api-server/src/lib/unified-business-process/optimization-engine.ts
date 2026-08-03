import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { processMetrics, processDiagnostics, processStages, businessProcesses, processRegistry } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

export interface OptimizationOpportunity {
  type:        string;
  description: string;
  impact:      "high" | "medium" | "low";
  stageId?:    string;
}

export async function computeProcessMetrics(processId: string, userId: number): Promise<{
  optimizationScore: number;
  opportunities:     OptimizationOpportunity[];
  slaAdherence:      number;
  bottleneckCount:   number;
}> {
  const metricId = `met_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  // Fetch stages
  const stagesResult = await db.execute(sql`
    SELECT stage_id, status, sla_hours, started_at, completed_at, stage_order
      FROM process_stages
     WHERE process_id = ${processId}
     ORDER BY stage_order ASC, created_at DESC
  `);
  const stages = (stagesResult as any).rows ?? [];

  // Bottlenecks: blocked stages
  const blocked = stages.filter((s: any) => s.status === "blocked");
  const bottleneckCount = blocked.length;

  // SLA adherence: stages that finished past their SLA
  let slaBreaches = 0;
  let totalWithSla = 0;
  let longestStageId: string | null = null;
  let longestHours = 0;

  for (const s of stages) {
    if (!s.sla_hours) continue;
    totalWithSla++;
    const start  = s.started_at  ? new Date(s.started_at).getTime()  : null;
    const finish = s.completed_at ? new Date(s.completed_at).getTime() : null;
    if (start && finish) {
      const durationHours = (finish - start) / 3_600_000;
      if (durationHours > longestHours) { longestHours = durationHours; longestStageId = s.stage_id; }
      if (durationHours > s.sla_hours)  slaBreaches++;
    }
  }
  const slaAdherence = totalWithSla > 0 ? Math.max(0, 100 - (slaBreaches / totalWithSla) * 100) : 100;

  // Opportunities
  const opportunities: OptimizationOpportunity[] = [];
  if (bottleneckCount > 0) {
    opportunities.push({ type: "bottleneck_removal", description: `${bottleneckCount} blocked stage(s) — resolve blockers to restore flow`, impact: "high" });
  }
  if (slaBreaches > 0) {
    opportunities.push({ type: "sla_improvement", description: `${slaBreaches} SLA breach(es) detected — review stage time budgets`, impact: "high" });
  }
  if (stages.length > 10) {
    opportunities.push({ type: "process_simplification", description: "Process has >10 stages — consider consolidating sequential steps", impact: "medium" });
  }
  if (stages.filter((s: any) => s.status === "pending").length > stages.length * 0.5) {
    opportunities.push({ type: "parallelization", description: "Most stages are pending — evaluate parallel execution", impact: "medium" });
  }

  const optimizationScore = Math.max(0, 100 - bottleneckCount * 15 - slaBreaches * 10 - opportunities.length * 5);

  // Persist metrics
  await db.insert(processMetrics).values({
    metricId,
    processId,
    userId,
    slaAdherence,
    slaBreachCount:    slaBreaches,
    bottleneckCount,
    optimizationScore,
    longestStageId:    longestStageId ?? null,
    longestStageHours: longestHours,
    opportunities,
    computedAt:        new Date(),
  });

  // Update registry health score
  await db.execute(sql`
    UPDATE process_registry
       SET health_score = ${optimizationScore},
           sla_status   = ${slaBreaches > 0 ? "breached" : "on_track"},
           updated_at   = NOW()
     WHERE process_id = ${processId}
  `);

  // Emit diagnostic for each opportunity
  for (const opp of opportunities.filter((o) => o.impact === "high")) {
    const diagnosticId = `pdiag_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
    await db.insert(processDiagnostics).values({
      diagnosticId,
      processId,
      userId,
      severity:        "warning",
      category:        opp.type === "bottleneck_removal" ? "bottleneck" : "sla_risk",
      title:           opp.description,
      description:     opp.description,
      recommendation:  "Review stage configuration and resolve blockers.",
    });
  }

  return { optimizationScore, opportunities, slaAdherence, bottleneckCount };
}

export async function getMetrics(processId: string) {
  return db.select().from(processMetrics)
    .where(eq(processMetrics.processId, processId))
    .orderBy(sql`computed_at DESC`)
    .limit(1);
}

export async function getDiagnostics(processId?: string, userId?: number) {
  if (processId) {
    return db.select().from(processDiagnostics)
      .where(eq(processDiagnostics.processId, processId))
      .orderBy(sql`created_at DESC`).limit(50);
  }
  if (userId) {
    return db.select().from(processDiagnostics)
      .where(eq(processDiagnostics.userId, userId))
      .orderBy(sql`created_at DESC`).limit(50);
  }
  return [];
}
