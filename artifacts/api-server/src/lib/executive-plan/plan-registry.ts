// ─── Plan Registry (Build 009) ────────────────────────────────────────────────
//
// Full CRUD + plan generation + milestone/step management.
// Single source of truth for all plan persistence.
// Every plan-mutating operation goes through here so extension hooks fire
// consistently and plan history is always recorded.

import { randomUUID } from "crypto";
import {
  db,
  executivePlansTable,
  planMilestonesTable,
  planStepsTable,
  planDependenciesTable,
  planMetricsTable,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { logger } from "../logger";
import { generatePlanForStrategy } from "./plan-generation";
import { scorePlan, rankPlans, summarizePlanScore } from "./plan-scoring";
import { analyzePlanDependencies } from "./plan-dependency";
import { recordPlanRevision, recordAlternativeProposed } from "./plan-history";
import {
  PLAN_EXTENSION_POINT_IDS,
  firePlanHooks,
} from "./plan-extension-points";
import type {
  ExecutivePlan,
  PlanMilestone,
  PlanStep,
  PlanDependency,
  PlanMetric,
  PlanScore,
  PlanDependencyReport,
  PlanComparisonResult,
  GeneratedPlanResult,
  PlanDiagnostics,
  CreatePlanInput,
  UpdatePlanInput,
  GeneratePlanInput,
  AddPlanDependencyInput,
  AddPlanMetricInput,
  PlanningStrategy,
} from "./types";

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToPlan(row: typeof executivePlansTable.$inferSelect): ExecutivePlan {
  return {
    ...row,
    scoreDimensions: (row.scoreDimensions as Record<string, number>) ?? {},
    assumptions: (row.assumptions as string[]) ?? [],
    constraintsData: (row.constraintsData as string[]) ?? [],
    requiredResources: (row.requiredResources as string[]) ?? [],
    relatedContextIds: (row.relatedContextIds as string[]) ?? [],
    relatedJudgmentIds: (row.relatedJudgmentIds as string[]) ?? [],
    relatedGoalIds: (row.relatedGoalIds as string[]) ?? [],
    relatedArtifactIds: (row.relatedArtifactIds as string[]) ?? [],
    relatedKnowledgeIds: (row.relatedKnowledgeIds as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function rowToMilestone(row: typeof planMilestonesTable.$inferSelect): PlanMilestone {
  return {
    ...row,
    dependencies: (row.dependencies as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function rowToStep(row: typeof planStepsTable.$inferSelect): PlanStep {
  return {
    ...row,
    requiredCapabilities: (row.requiredCapabilities as string[]) ?? [],
    dependsOnStepIds: (row.dependsOnStepIds as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function rowToDependency(row: typeof planDependenciesTable.$inferSelect): PlanDependency {
  return { ...row };
}

function rowToMetric(row: typeof planMetricsTable.$inferSelect): PlanMetric {
  return { ...row };
}

// ─── Plan CRUD ────────────────────────────────────────────────────────────────

/** Create a bare plan (without generated milestones/steps). */
export async function createPlan(input: CreatePlanInput): Promise<ExecutivePlan> {
  const id = randomUUID();

  // Compute initial score
  const score = scorePlan({
    estimatedComplexity: input.estimatedComplexity ?? 50,
    estimatedRisk: input.estimatedRisk ?? 50,
    estimatedCost: input.estimatedCost,
    estimatedDurationDays: input.estimatedDurationDays,
    estimatedConfidence: input.estimatedConfidence ?? 50,
    goalPriorityScore: undefined,
  });

  const rows = await db
    .insert(executivePlansTable)
    .values({
      id,
      userId: input.userId,
      goalId: input.goalId ?? null,
      parentPlanId: input.parentPlanId ?? null,
      name: input.name,
      description: input.description ?? null,
      status: "draft",
      planningStrategy: input.planningStrategy ?? "top_down",
      estimatedComplexity: input.estimatedComplexity ?? 50,
      estimatedRisk: input.estimatedRisk ?? 50,
      estimatedCost: input.estimatedCost ?? null,
      estimatedDurationDays: input.estimatedDurationDays ?? null,
      estimatedConfidence: input.estimatedConfidence ?? 50,
      priority: input.priority ?? 50,
      successProbability: 50,
      overallScore: score.overallScore,
      scoreDimensions: score.dimensions as Record<string, number>,
      isAlternative: input.isAlternative ?? false,
      assumptions: input.assumptions ?? [],
      constraintsData: input.constraintsData ?? [],
      requiredResources: input.requiredResources ?? [],
      relatedContextIds: input.relatedContextIds ?? [],
      relatedJudgmentIds: input.relatedJudgmentIds ?? [],
      relatedGoalIds: input.relatedGoalIds ?? [],
      metadata: input.metadata ?? {},
    })
    .returning();

  const plan = rowToPlan(rows[0]);

  // Record initial history
  void recordPlanRevision(plan, "Plan created", "executive-plan").catch(() => {/* non-fatal */});

  // Fire extension hook
  void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_GENERATED, { plan }).catch(() => {});

  return plan;
}

/** Retrieve a plan by ID. */
export async function getPlan(planId: string): Promise<ExecutivePlan | null> {
  const rows = await db
    .select()
    .from(executivePlansTable)
    .where(eq(executivePlansTable.id, planId))
    .limit(1);
  return rows.length > 0 ? rowToPlan(rows[0]) : null;
}

/** List plans for a user. */
export async function listPlans(
  userId: number,
  opts: {
    status?: string;
    goalId?: string;
    isAlternative?: boolean;
    limit?: number;
  } = {},
): Promise<ExecutivePlan[]> {
  const conditions = [eq(executivePlansTable.userId, userId)];
  if (opts.status) conditions.push(eq(executivePlansTable.status, opts.status));
  if (opts.goalId) conditions.push(eq(executivePlansTable.goalId, opts.goalId));
  if (opts.isAlternative !== undefined) {
    conditions.push(eq(executivePlansTable.isAlternative, opts.isAlternative));
  }

  const rows = await db
    .select()
    .from(executivePlansTable)
    .where(and(...conditions))
    .orderBy(desc(executivePlansTable.overallScore))
    .limit(opts.limit ?? 50);
  return rows.map(rowToPlan);
}

/** List active (non-archived, non-rejected) plans for a user. */
export async function listActivePlans(userId: number): Promise<ExecutivePlan[]> {
  const rows = await db
    .select()
    .from(executivePlansTable)
    .where(
      and(
        eq(executivePlansTable.userId, userId),
        inArray(executivePlansTable.status, ["draft", "active", "approved", "paused"]),
      ),
    )
    .orderBy(desc(executivePlansTable.overallScore))
    .limit(20);
  return rows.map(rowToPlan);
}

/** Update a plan's editable fields. */
export async function updatePlan(
  planId: string,
  input: UpdatePlanInput,
): Promise<ExecutivePlan | null> {
  const existing = await getPlan(planId);
  if (!existing) return null;

  const prevStatus = existing.status;

  // Recompute score if scoring inputs changed
  let scoreUpdate: Partial<typeof input & { overallScore: number; scoreDimensions: Record<string, number>; successProbability: number }> = {};
  if (
    input.estimatedComplexity !== undefined ||
    input.estimatedRisk !== undefined ||
    input.estimatedCost !== undefined ||
    input.estimatedDurationDays !== undefined ||
    input.estimatedConfidence !== undefined
  ) {
    const score = scorePlan({
      estimatedComplexity: input.estimatedComplexity ?? existing.estimatedComplexity,
      estimatedRisk: input.estimatedRisk ?? existing.estimatedRisk,
      estimatedCost: input.estimatedCost ?? existing.estimatedCost,
      estimatedDurationDays: input.estimatedDurationDays ?? existing.estimatedDurationDays,
      estimatedConfidence: input.estimatedConfidence ?? existing.estimatedConfidence,
    });
    scoreUpdate = {
      overallScore: score.overallScore,
      scoreDimensions: score.dimensions as Record<string, number>,
      successProbability: Math.round(
        (score.dimensions.risk * 0.4 + score.dimensions.confidence * 0.4 + score.dimensions.complexity * 0.2),
      ),
    };
    void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_SCORED, {
      planId,
      score,
      dimensions: score.dimensions,
    }).catch(() => {});
  }

  const rows = await db
    .update(executivePlansTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.planningStrategy !== undefined && { planningStrategy: input.planningStrategy }),
      ...(input.estimatedComplexity !== undefined && { estimatedComplexity: input.estimatedComplexity }),
      ...(input.estimatedRisk !== undefined && { estimatedRisk: input.estimatedRisk }),
      ...(input.estimatedCost !== undefined && { estimatedCost: input.estimatedCost }),
      ...(input.estimatedDurationDays !== undefined && { estimatedDurationDays: input.estimatedDurationDays }),
      ...(input.estimatedConfidence !== undefined && { estimatedConfidence: input.estimatedConfidence }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.successProbability !== undefined && { successProbability: input.successProbability }),
      ...(input.assumptions !== undefined && { assumptions: input.assumptions }),
      ...(input.constraintsData !== undefined && { constraintsData: input.constraintsData }),
      ...(input.requiredResources !== undefined && { requiredResources: input.requiredResources }),
      ...(input.relatedContextIds !== undefined && { relatedContextIds: input.relatedContextIds }),
      ...(input.relatedJudgmentIds !== undefined && { relatedJudgmentIds: input.relatedJudgmentIds }),
      ...(input.relatedGoalIds !== undefined && { relatedGoalIds: input.relatedGoalIds }),
      ...(input.relatedArtifactIds !== undefined && { relatedArtifactIds: input.relatedArtifactIds }),
      ...(input.relatedKnowledgeIds !== undefined && { relatedKnowledgeIds: input.relatedKnowledgeIds }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      ...scoreUpdate,
      version: existing.version + 1,
    })
    .where(eq(executivePlansTable.id, planId))
    .returning();

  if (rows.length === 0) return null;
  const updated = rowToPlan(rows[0]);

  // Fire status-change hook
  if (input.status && input.status !== prevStatus) {
    void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_STATUS_CHANGED, {
      plan: updated,
      previousStatus: prevStatus,
      newStatus: input.status,
    }).catch(() => {});

    if (input.status === "archived" || input.status === "rejected") {
      void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_ARCHIVED, {
        plan: updated,
      }).catch(() => {});
    }
  }

  void recordPlanRevision(updated, `Updated plan (v${updated.version})`, "executive-plan").catch(() => {});

  return updated;
}

/** Archive a plan (soft cancel). */
export async function archivePlan(planId: string, reason?: string): Promise<ExecutivePlan | null> {
  return updatePlan(planId, { status: "archived", metadata: reason ? { archiveReason: reason } : undefined });
}

// ─── Milestone CRUD ───────────────────────────────────────────────────────────

/** Retrieve all milestones for a plan, ordered by orderIndex. */
export async function getPlanMilestones(planId: string): Promise<PlanMilestone[]> {
  const rows = await db
    .select()
    .from(planMilestonesTable)
    .where(eq(planMilestonesTable.planId, planId))
    .orderBy(asc(planMilestonesTable.orderIndex));
  return rows.map(rowToMilestone);
}

/** Retrieve child milestones for a parent milestone. */
export async function getChildMilestones(parentMilestoneId: string): Promise<PlanMilestone[]> {
  const rows = await db
    .select()
    .from(planMilestonesTable)
    .where(eq(planMilestonesTable.parentMilestoneId, parentMilestoneId))
    .orderBy(asc(planMilestonesTable.orderIndex));
  return rows.map(rowToMilestone);
}

/** Update milestone status/progress. */
export async function updateMilestoneStatus(
  milestoneId: string,
  status: string,
  progressPct?: number,
): Promise<PlanMilestone | null> {
  const rows = await db
    .update(planMilestonesTable)
    .set({
      status,
      ...(progressPct !== undefined && { progressPct }),
    })
    .where(eq(planMilestonesTable.id, milestoneId))
    .returning();

  if (rows.length === 0) return null;
  const ms = rowToMilestone(rows[0]);

  if (status === "completed") {
    // Fetch parent plan to include in hook payload
    const plan = await getPlan(ms.planId).catch(() => null);
    if (plan) {
      void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_MILESTONE_COMPLETED, {
        plan,
        milestone: ms,
      }).catch(() => {});
    }
  }

  return ms;
}

// ─── Step retrieval ───────────────────────────────────────────────────────────

/** Retrieve all steps for a milestone, ordered by orderIndex. */
export async function getMilestoneSteps(milestoneId: string): Promise<PlanStep[]> {
  const rows = await db
    .select()
    .from(planStepsTable)
    .where(eq(planStepsTable.milestoneId, milestoneId))
    .orderBy(asc(planStepsTable.orderIndex));
  return rows.map(rowToStep);
}

/** Retrieve all steps for a plan. */
export async function getPlanSteps(planId: string): Promise<PlanStep[]> {
  const rows = await db
    .select()
    .from(planStepsTable)
    .where(eq(planStepsTable.planId, planId))
    .orderBy(asc(planStepsTable.orderIndex));
  return rows.map(rowToStep);
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

/** Add a dependency edge. */
export async function addPlanDependency(input: AddPlanDependencyInput): Promise<PlanDependency> {
  const rows = await db
    .insert(planDependenciesTable)
    .values({
      id: randomUUID(),
      sourceId: input.sourceId,
      targetId: input.targetId,
      sourceType: input.sourceType,
      dependencyType: input.dependencyType ?? "requires",
      note: input.note ?? null,
    })
    .returning();
  return rowToDependency(rows[0]);
}

/** Get all dependencies for a source. */
export async function getPlanDependencies(sourceId: string): Promise<PlanDependency[]> {
  const rows = await db
    .select()
    .from(planDependenciesTable)
    .where(eq(planDependenciesTable.sourceId, sourceId));
  return rows.map(rowToDependency);
}

/** Remove a dependency edge. */
export async function removePlanDependency(dependencyId: string): Promise<boolean> {
  const result = await db
    .delete(planDependenciesTable)
    .where(eq(planDependenciesTable.id, dependencyId));
  return (result.rowCount ?? 0) > 0;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

/** Record a metric reading for a plan. */
export async function addPlanMetric(input: AddPlanMetricInput): Promise<PlanMetric> {
  const rows = await db
    .insert(planMetricsTable)
    .values({
      id: randomUUID(),
      planId: input.planId,
      metricKey: input.metricKey,
      metricValue: input.metricValue ?? null,
      unit: input.unit ?? null,
      targetValue: input.targetValue ?? null,
    })
    .returning();
  return rowToMetric(rows[0]);
}

/** Retrieve all metrics for a plan. */
export async function getPlanMetrics(planId: string): Promise<PlanMetric[]> {
  const rows = await db
    .select()
    .from(planMetricsTable)
    .where(eq(planMetricsTable.planId, planId))
    .orderBy(desc(planMetricsTable.recordedAt));
  return rows.map(rowToMetric);
}

// ─── Plan generation ──────────────────────────────────────────────────────────

/** Persist milestones and steps generated by the generation engine. */
async function persistMilestones(
  planId: string,
  milestones: PlanMilestone[],
): Promise<PlanMilestone[]> {
  const persisted: PlanMilestone[] = [];
  for (const ms of milestones) {
    const msRows = await db
      .insert(planMilestonesTable)
      .values({
        id: ms.id,
        planId,
        parentMilestoneId: ms.parentMilestoneId,
        name: ms.name,
        description: ms.description,
        status: ms.status,
        orderIndex: ms.orderIndex,
        progressPct: ms.progressPct,
        estimatedDurationDays: ms.estimatedDurationDays,
        dependencies: ms.dependencies,
        metadata: ms.metadata,
      })
      .returning();
    const persistedMs = rowToMilestone(msRows[0]);
    persistedMs.steps = [];

    // Persist steps for this milestone
    if (ms.steps && ms.steps.length > 0) {
      const stepRows = await db
        .insert(planStepsTable)
        .values(
          ms.steps.map((s) => ({
            id: s.id,
            milestoneId: ms.id,
            planId,
            name: s.name,
            description: s.description,
            status: s.status,
            orderIndex: s.orderIndex,
            estimatedEffortHours: s.estimatedEffortHours,
            requiredCapabilities: s.requiredCapabilities,
            dependsOnStepIds: s.dependsOnStepIds,
            assignedBrain: s.assignedBrain,
            metadata: s.metadata,
          })),
        )
        .returning();
      persistedMs.steps = stepRows.map(rowToStep);
    }

    persisted.push(persistedMs);
  }
  return persisted;
}

/** Generate a plan from a goal using a specific strategy, persist it, and return
 *  the full GeneratedPlanResult. */
export async function generateAndPersistPlan(
  input: GeneratePlanInput,
  strategy: PlanningStrategy = "top_down",
): Promise<GeneratedPlanResult> {
  const output = generatePlanForStrategy(input, strategy);

  // Compute final score with persisted step count known
  const allSteps = output.milestones.flatMap((m) => m.steps ?? []);
  const score = scorePlan({
    estimatedComplexity: output.estimatedComplexity,
    estimatedRisk: output.estimatedRisk,
    estimatedDurationDays: output.estimatedDurationDays,
    estimatedConfidence: output.estimatedConfidence,
    stepCount: allSteps.length,
    goalPriorityScore: input.goalPriorityScore,
  });

  const successProbability = Math.round(
    score.dimensions.risk * 0.4 + score.dimensions.confidence * 0.4 + score.dimensions.complexity * 0.2,
  );

  // Persist plan row
  const planRows = await db
    .insert(executivePlansTable)
    .values({
      id: output.planId,
      userId: input.userId,
      goalId: input.goalId,
      name: output.name,
      description: output.description,
      status: "draft",
      planningStrategy: strategy,
      estimatedDurationDays: output.estimatedDurationDays,
      estimatedComplexity: output.estimatedComplexity,
      estimatedRisk: output.estimatedRisk,
      estimatedConfidence: output.estimatedConfidence,
      priority: output.priority,
      successProbability,
      overallScore: score.overallScore,
      scoreDimensions: score.dimensions as Record<string, number>,
      isAlternative: false,
      assumptions: output.assumptions,
      constraintsData: output.constraintsData,
      requiredResources: output.requiredResources,
      relatedContextIds: input.contextSnapshotId ? [input.contextSnapshotId] : [],
      relatedJudgmentIds: input.judgmentId ? [input.judgmentId] : [],
      relatedGoalIds: [input.goalId],
    })
    .returning();

  const plan = rowToPlan(planRows[0]);
  const milestones = await persistMilestones(plan.id, output.milestones);

  // Run dependency analysis
  const depReport = analyzePlanDependencies({
    planId: plan.id,
    milestones,
    steps: milestones.flatMap((m) => m.steps ?? []),
    planDependencies: [],
  });

  const result: GeneratedPlanResult = { plan, milestones, score, dependencyReport: depReport };

  // Record history + fire hooks
  void recordPlanRevision(plan, `Generated via ${strategy} strategy`, "executive-plan").catch(() => {});
  void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_GENERATED, result).catch(() => {});
  if (depReport.hasErrors || depReport.hasWarnings) {
    void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_DEPENDENCY_DETECTED, depReport).catch(() => {});
  }
  void firePlanHooks(PLAN_EXTENSION_POINT_IDS.PLAN_SCORED, {
    planId: plan.id,
    score,
    dimensions: score.dimensions,
  }).catch(() => {});

  return result;
}

/** Generate multiple alternative plans using different strategies, rank them. */
export async function generateAlternativePlans(
  input: GeneratePlanInput,
): Promise<GeneratedPlanResult[]> {
  const strategies: PlanningStrategy[] = input.strategies ?? ["top_down", "bottom_up", "agile"];
  const results: GeneratedPlanResult[] = [];

  for (const strategy of strategies) {
    const result = await generateAndPersistPlan(input, strategy);
    results.push(result);
  }

  // Mark non-primary plans as alternatives (first is primary)
  if (results.length > 1) {
    const primaryId = results[0].plan.id;
    for (let i = 1; i < results.length; i++) {
      await db
        .update(executivePlansTable)
        .set({ isAlternative: true, parentPlanId: primaryId })
        .where(eq(executivePlansTable.id, results[i].plan.id));
      results[i].plan.isAlternative = true;
      results[i].plan.parentPlanId = primaryId;
      void recordAlternativeProposed(
        primaryId,
        results[i].plan.id,
        results[i].plan.name,
        1,
      ).catch(() => {});
    }
  }

  // Sort by overall score descending
  results.sort((a, b) => b.score.overallScore - a.score.overallScore);
  return results;
}

// ─── Plan comparison ──────────────────────────────────────────────────────────

/** Compare multiple plans side-by-side, rank by overall score. */
export async function comparePlans(planIds: string[]): Promise<PlanComparisonResult> {
  const plans = await Promise.all(planIds.map(getPlan));
  const validPlans = plans.filter((p): p is ExecutivePlan => p !== null);

  const ranked = rankPlans(validPlans.map((p) => ({ planId: p.id, overallScore: p.overallScore })));

  return {
    plans: ranked.map(({ planId, overallScore, rank }) => {
      const plan = validPlans.find((p) => p.id === planId)!;
      const { strengths, weaknesses } = summarizePlanScore({
        overallScore,
        dimensions: plan.scoreDimensions as {
          complexity: number;
          risk: number;
          cost: number;
          duration: number;
          resource_demand: number;
          strategic_alignment: number;
          confidence: number;
        },
      });
      return {
        planId,
        name: plan.name,
        overallScore,
        rank,
        strengths,
        weaknesses,
        dimensions: plan.scoreDimensions,
      };
    }),
    recommendedPlanId: ranked[0]?.planId ?? null,
    analyzedAt: new Date(),
  };
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

/** Aggregate planning diagnostics for a user. */
export async function buildPlanDiagnostics(
  userId: number | null,
): Promise<PlanDiagnostics> {
  try {
    const allPlans = userId !== null
      ? await listPlans(userId, { limit: 200 })
      : [];

    const byStatus: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};
    let scoreSum = 0;
    let probSum = 0;
    let altCount = 0;
    let mostRecentId: string | null = null;
    let mostRecentDate: Date | null = null;

    for (const p of allPlans) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      byStrategy[p.planningStrategy] = (byStrategy[p.planningStrategy] ?? 0) + 1;
      scoreSum += p.overallScore;
      probSum += p.successProbability;
      if (p.isAlternative) altCount++;
      if (!mostRecentDate || p.createdAt > mostRecentDate) {
        mostRecentDate = p.createdAt;
        mostRecentId = p.id;
      }
    }

    return {
      userId,
      totalPlans: allPlans.length,
      byStatus,
      byStrategy,
      averageScore: allPlans.length > 0 ? Math.round(scoreSum / allPlans.length) : 0,
      averageSuccessProbability: allPlans.length > 0 ? Math.round(probSum / allPlans.length) : 0,
      alternativePlansCount: altCount,
      mostRecentPlanId: mostRecentId,
      analysedAt: new Date(),
    };
  } catch (err) {
    logger.warn({ err, userId }, "Plan diagnostics failed (returning empty)");
    return {
      userId,
      totalPlans: 0,
      byStatus: {},
      byStrategy: {},
      averageScore: 0,
      averageSuccessProbability: 0,
      alternativePlansCount: 0,
      mostRecentPlanId: null,
      analysedAt: new Date(),
    };
  }
}
