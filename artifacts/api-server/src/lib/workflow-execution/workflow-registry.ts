// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Registry (DB Persistence)
// FK insertion order: workflows → nodes → edges → checkpoints →
//                     branches → rollbacks → registry → snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  executionWorkflows,
  workflowNodes,
  workflowEdges,
  workflowCheckpoints,
  workflowBranches,
  workflowRollbacks,
  workflowRegistry,
  workflowSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ExecutionWorkflow, WorkflowSummary } from "./types";

const logger = { warn: console.warn.bind(console), info: console.info.bind(console) };

export async function persistWorkflow(wf: ExecutionWorkflow): Promise<void> {
  // 1. execution_workflows
  await db.insert(executionWorkflows).values({
    id:                    wf.id,
    businessId:            wf.businessId,
    userId:                wf.userId ?? null,
    simulationReportId:    wf.simulationReportId ?? null,
    riskReportId:          wf.riskReportId ?? null,
    authorityReportId:     wf.authorityReportId ?? null,
    orchestrationReportId: wf.orchestrationReportId ?? null,
    nodeCount:             wf.nodeCount,
    edgeCount:             wf.edgeCount,
    checkpointCount:       wf.checkpointCount,
    branchCount:           wf.branchCount,
    rollbackCount:         wf.rollbackCount,
    phaseCount:            wf.phaseCount,
    workflowComplexity:    wf.workflowComplexity,
    rollbackCoverage:      String(wf.rollbackCoverage),
    workflowConfidence:    String(wf.workflowConfidence),
    isWorkflowReady:       wf.isWorkflowReady,
    executiveSummary:      wf.executiveSummary,
    buildDurationMs:       wf.buildDurationMs,
  });

  // 2. workflow_nodes
  if (wf.nodes.length > 0) {
    await db.insert(workflowNodes).values(
      wf.nodes.map((n) => ({
        id:                     n.id,
        workflowId:             wf.id,
        businessId:             wf.businessId,
        assignmentId:           n.assignmentId ?? null,
        workPackageId:          n.workPackageId ?? null,
        packageTitle:           n.packageTitle ?? null,
        phase:                  n.phase,
        nodeType:               n.nodeType,
        nodeTitle:              n.nodeTitle,
        nodeDescription:        n.nodeDescription,
        sequencePosition:       n.sequencePosition,
        ownerType:              n.ownerType,
        executionClass:         n.executionClass,
        estimatedDurationHours: String(n.estimatedDurationHours),
        isCritical:             n.isCritical,
        status:                 n.status,
      }))
    );
  }

  // 3. workflow_edges
  if (wf.edges.length > 0) {
    await db.insert(workflowEdges).values(
      wf.edges.map((e) => ({
        id:         e.id,
        workflowId: wf.id,
        businessId: wf.businessId,
        fromNodeId: e.fromNodeId,
        toNodeId:   e.toNodeId,
        edgeType:   e.edgeType,
        edgeLabel:  e.edgeLabel,
        condition:  e.condition,
        isCritical: e.isCritical,
      }))
    );
  }

  // 4. workflow_checkpoints
  if (wf.checkpoints.length > 0) {
    await db.insert(workflowCheckpoints).values(
      wf.checkpoints.map((c) => ({
        id:                 c.id,
        workflowId:         wf.id,
        nodeId:             c.nodeId,
        businessId:         wf.businessId,
        checkpointType:     c.checkpointType,
        expectedState:      c.expectedState,
        requiredValidation: c.requiredValidation,
        rollbackMarker:     c.rollbackMarker,
        successCriteria:    c.successCriteria,
        isBlocking:         c.isBlocking,
      }))
    );
  }

  // 5. workflow_branches
  if (wf.branches.length > 0) {
    await db.insert(workflowBranches).values(
      wf.branches.map((b) => ({
        id:                b.id,
        workflowId:        wf.id,
        nodeId:            b.nodeId,
        businessId:        wf.businessId,
        branchCondition:   b.branchCondition,
        targetNodeId:      b.targetNodeId ?? null,
        branchDescription: b.branchDescription,
        priority:          b.priority,
        isDefaultPath:     b.isDefaultPath,
      }))
    );
  }

  // 6. workflow_rollbacks
  if (wf.rollbacks.length > 0) {
    await db.insert(workflowRollbacks).values(
      wf.rollbacks.map((r) => ({
        id:                             r.id,
        workflowId:                     wf.id,
        nodeId:                         r.nodeId,
        businessId:                     wf.businessId,
        rollbackTargetNodeId:           r.rollbackTargetNodeId ?? null,
        rollbackStrategy:               r.rollbackStrategy,
        rollbackSteps:                  r.rollbackSteps,
        estimatedRollbackDurationHours: String(r.estimatedRollbackDurationHours),
        rollbackConfidence:             String(r.rollbackConfidence),
      }))
    );
  }

  // 7. Upsert workflow_registry
  await db
    .insert(workflowRegistry)
    .values({
      id:                 randomUUID(),
      businessId:         wf.businessId,
      latestWorkflowId:   wf.id,
      nodeCount:          wf.nodeCount,
      edgeCount:          wf.edgeCount,
      checkpointCount:    wf.checkpointCount,
      rollbackCoverage:   String(wf.rollbackCoverage),
      workflowConfidence: String(wf.workflowConfidence),
      isWorkflowReady:    wf.isWorkflowReady,
      lastBuildAt:        new Date(),
    })
    .onConflictDoUpdate({
      target: workflowRegistry.businessId,
      set: {
        latestWorkflowId:   wf.id,
        nodeCount:          wf.nodeCount,
        edgeCount:          wf.edgeCount,
        checkpointCount:    wf.checkpointCount,
        rollbackCoverage:   String(wf.rollbackCoverage),
        workflowConfidence: String(wf.workflowConfidence),
        isWorkflowReady:    wf.isWorkflowReady,
        lastBuildAt:        new Date(),
        updatedAt:          new Date(),
      },
    });

  // 8. workflow_snapshots
  await db.insert(workflowSnapshots).values({
    id:           randomUUID(),
    workflowId:   wf.id,
    businessId:   wf.businessId,
    userId:       wf.userId ?? null,
    snapshotData: {
      nodeCount:          wf.nodeCount,
      edgeCount:          wf.edgeCount,
      checkpointCount:    wf.checkpointCount,
      phaseCount:         wf.phaseCount,
      workflowComplexity: wf.workflowComplexity,
      rollbackCoverage:   wf.rollbackCoverage,
      workflowConfidence: wf.workflowConfidence,
      isWorkflowReady:    wf.isWorkflowReady,
    },
  });

  logger.info({ businessId: wf.businessId, workflowId: wf.id }, "Workflow persisted");
}

export async function getLatestWorkflowSummary(userId: number): Promise<WorkflowSummary | null> {
  try {
    const regRows = await db
      .select()
      .from(workflowRegistry)
      .orderBy(workflowRegistry.lastBuildAt)
      .limit(1);

    if (!regRows[0]?.latestWorkflowId) return null;

    const wfRows = await db
      .select()
      .from(executionWorkflows)
      .where(eq(executionWorkflows.id, regRows[0].latestWorkflowId))
      .limit(1);

    if (!wfRows[0]) return null;
    const r = wfRows[0];

    return {
      workflowId:         r.id,
      businessId:         r.businessId,
      nodeCount:          r.nodeCount,
      edgeCount:          r.edgeCount,
      checkpointCount:    r.checkpointCount,
      phaseCount:         r.phaseCount,
      workflowComplexity: r.workflowComplexity as any,
      rollbackCoverage:   Number(r.rollbackCoverage),
      workflowConfidence: Number(r.workflowConfidence),
      isWorkflowReady:    r.isWorkflowReady,
      executiveSummary:   r.executiveSummary,
      createdAt:          r.createdAt,
    };
  } catch (err) {
    logger.warn({ err, userId }, "Workflow registry: fetch failed");
    return null;
  }
}
