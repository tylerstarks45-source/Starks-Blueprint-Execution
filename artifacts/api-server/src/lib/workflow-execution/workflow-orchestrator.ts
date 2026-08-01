// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Orchestrator
// Full build: reads execution assignments + upstream context →
// constructs nodes → builds edges → creates checkpoints →
// defines branches → assigns rollback paths → evaluates →
// assembles workflow → persists.
// Never executes, modifies systems, or changes state.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  executionOrchestrationRegistry,
  executionAssignments as executionAssignmentsTable,
  simulationRegistry,
  executionRiskRegistry,
  authorityRegistry,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

import { constructWorkflowNodes } from "./workflow-construction-engine";
import { buildDependencyGraph }    from "./dependency-graph-engine";
import { createCheckpoints }        from "./checkpoint-engine";
import { defineConditionalRoutes }  from "./conditional-routing-engine";
import { assignRollbackPaths }      from "./rollback-path-engine";
import { evaluateWorkflow }         from "./workflow-evaluation-engine";
import { assembleWorkflowReport, buildWorkflowSummary } from "./workflow-report-engine";
import { persistWorkflow, getLatestWorkflowSummary }    from "./workflow-registry";
import type { WorkflowSummary } from "./types";

const logger = { info: console.info.bind(console), warn: console.warn.bind(console) };

export async function buildExecutionWorkflow(params: {
  userId:     number;
  businessId: number;
}): Promise<WorkflowSummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch orchestration registry ───────────────────────────────────────
    const eoRegRows = await db
      .select()
      .from(executionOrchestrationRegistry)
      .where(eq(executionOrchestrationRegistry.businessId, businessId))
      .limit(1);

    if (!eoRegRows[0]?.latestPlanId) {
      logger.warn({ businessId }, "Workflow Build: no orchestration plan — skipping");
      return null;
    }
    const orchestrationPlanId   = eoRegRows[0].latestPlanId;
    const orchestrationReportId = eoRegRows[0].latestReportId ?? undefined;

    // ── 2. Fetch upstream context ──────────────────────────────────────────────
    const [simRegRows, riskRegRows, authRegRows] = await Promise.all([
      db.select().from(simulationRegistry).where(eq(simulationRegistry.businessId, businessId)).limit(1),
      db.select().from(executionRiskRegistry).where(eq(executionRiskRegistry.businessId, businessId)).limit(1),
      db.select().from(authorityRegistry).where(eq(authorityRegistry.businessId, businessId)).limit(1),
    ]);

    const simulationReportId  = simRegRows[0]?.latestReportId  ?? undefined;
    const riskReportId        = riskRegRows[0]?.latestReportId ?? undefined;
    const authorityReportId   = authRegRows[0]?.latestReportId ?? undefined;

    // ── 3. Fetch execution assignments ─────────────────────────────────────────
    const assignmentRows = await db
      .select()
      .from(executionAssignmentsTable)
      .where(eq(executionAssignmentsTable.planId, orchestrationPlanId))
      .orderBy(asc(executionAssignmentsTable.sequencePosition));

    if (assignmentRows.length === 0) {
      logger.warn({ businessId }, "Workflow Build: no assignments — skipping");
      return null;
    }

    // ── 4. Construct workflow nodes ────────────────────────────────────────────
    const workflowId = crypto.randomUUID();

    const nodes = constructWorkflowNodes(
      workflowId,
      businessId,
      assignmentRows.map((r) => ({
        id:                     r.id,
        workPackageId:          r.workPackageId ?? undefined,
        packageTitle:           r.packageTitle ?? undefined,
        ownerType:              r.ownerType,
        executionClass:         r.executionClass,
        complexityLevel:        r.complexityLevel ?? "medium",
        businessCriticality:    r.businessCriticality ?? "medium",
        sequencePosition:       r.sequencePosition ?? 0,
        estimatedDurationHours: 1.0,
      }))
    );

    // ── 5. Build dependency graph ──────────────────────────────────────────────
    const edges = buildDependencyGraph(workflowId, businessId, nodes);

    // ── 6. Create checkpoints ──────────────────────────────────────────────────
    const checkpoints = createCheckpoints(workflowId, businessId, nodes);

    // ── 7. Define conditional branches ────────────────────────────────────────
    const branches = defineConditionalRoutes(workflowId, businessId, nodes);

    // ── 8. Assign rollback paths ───────────────────────────────────────────────
    const rollbacks = assignRollbackPaths(workflowId, businessId, nodes);

    // ── 9. Evaluate workflow ───────────────────────────────────────────────────
    const evaluation = evaluateWorkflow({ nodes, edges, checkpoints, branches, rollbacks });

    // ── 10. Assemble and persist ───────────────────────────────────────────────
    const buildDurationMs = Date.now() - start;
    const workflow = assembleWorkflowReport({
      businessId, userId,
      simulationReportId, riskReportId, authorityReportId, orchestrationReportId,
      nodes, edges, checkpoints, branches, rollbacks, evaluation, buildDurationMs,
    });
    // Use pre-assigned workflowId
    (workflow as { id: string }).id = workflowId;

    await persistWorkflow(workflow);

    const summary = buildWorkflowSummary(workflow);
    logger.info({ businessId, nodeCount: nodes.length, isWorkflowReady: workflow.isWorkflowReady }, "Workflow Build: complete");
    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Workflow Build: failed (fail-open)");
    return null;
  }
}

export async function fetchWorkflowSummaryForEB(userId: number): Promise<WorkflowSummary | null> {
  return getLatestWorkflowSummary(userId);
}
