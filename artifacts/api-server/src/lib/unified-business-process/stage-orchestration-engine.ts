import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { processStages, processSteps, processRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { StageType, StepType } from "./types.js";

// ─── Stages ────────────────────────────────────────────────────────────────
export interface CreateStageInput {
  processId:        string;
  userId:           number;
  title:            string;
  description?:     string;
  stageOrder:       number;
  stageType:        StageType;
  assigneeId?:      number;
  assigneeType?:    string;
  requiresApproval?: boolean;
  slaHours?:        number;
  dueAt?:           Date;
}

export async function createStage(input: CreateStageInput) {
  const stageId = `stg_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(processStages).values({
    stageId,
    processId:        input.processId,
    userId:           input.userId,
    title:            input.title,
    description:      input.description ?? null,
    stageOrder:       input.stageOrder,
    stageType:        input.stageType,
    assigneeId:       input.assigneeId ?? null,
    assigneeType:     input.assigneeType ?? null,
    requiresApproval: input.requiresApproval ?? false,
    slaHours:         input.slaHours ?? null,
    dueAt:            input.dueAt ?? null,
    status:           "pending",
  }).returning()) as any[];

  // Bump stage_count in registry
  await db.execute(sql`
    UPDATE process_registry
       SET stage_count = stage_count + 1,
           updated_at  = NOW()
     WHERE process_id = ${input.processId}
  `);

  return rows[0];
}

export async function advanceStage(stageId: string, status: "in_progress" | "completed" | "blocked" | "skipped", blockedReason?: string) {
  const stages = await db.select().from(processStages)
    .where(eq(processStages.stageId, stageId)).limit(1);
  if (!stages[0]) throw new Error(`Stage ${stageId} not found`);

  const stage = stages[0];
  const now = new Date();

  await db.execute(sql`
    INSERT INTO process_stages (stage_id, process_id, user_id, title, description,
      stage_order, stage_type, status, assignee_id, assignee_type, requires_approval,
      sla_hours, started_at, completed_at, due_at, blocked_reason, step_count, completed_steps, metadata, created_at)
    VALUES (
      ${`stg_${randomUUID().replace(/-/g, "").slice(0, 20)}`}, ${stage.processId}, ${stage.userId},
      ${stage.title}, ${stage.description ?? null}, ${stage.stageOrder}, ${stage.stageType},
      ${status}, ${stage.assigneeId ?? null}, ${stage.assigneeType ?? null}, ${stage.requiresApproval ?? false},
      ${stage.slaHours ?? null},
      ${status === "in_progress" ? now : stage.startedAt ?? null},
      ${status === "completed"   ? now : stage.completedAt ?? null},
      ${stage.dueAt ?? null}, ${blockedReason ?? null},
      ${stage.stepCount}, ${stage.completedSteps}, ${JSON.stringify(stage.metadata ?? {})}, NOW()
    )
  `);

  // Update registry if completed
  if (status === "completed") {
    await db.execute(sql`
      UPDATE process_registry
         SET completed_stages    = completed_stages + 1,
             completion_percent  = CASE WHEN stage_count > 0 THEN ((completed_stages + 1)::real / stage_count) * 100 ELSE 0 END,
             last_progress_at    = NOW(),
             updated_at          = NOW()
       WHERE process_id = ${stage.processId}
    `);
  }
  if (status === "blocked") {
    await db.execute(sql`
      UPDATE process_registry
         SET blocked_stages = blocked_stages + 1,
             bottleneck_stage_id = ${stageId},
             updated_at = NOW()
       WHERE process_id = ${stage.processId}
    `);
  }

  return { stageId, status };
}

export async function listStages(processId: string) {
  return db.select().from(processStages)
    .where(eq(processStages.processId, processId))
    .orderBy(sql`stage_order ASC, created_at DESC`);
}

// ─── Steps ─────────────────────────────────────────────────────────────────
export interface CreateStepInput {
  stageId:      string;
  processId:    string;
  userId:       number;
  title:        string;
  description?: string;
  stepOrder:    number;
  stepType:     StepType;
  isRequired?:  boolean;
  isBlocking?:  boolean;
  assigneeId?:  number;
}

export async function createStep(input: CreateStepInput) {
  const stepId = `step_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const rows = (await db.insert(processSteps).values({
    stepId,
    stageId:    input.stageId,
    processId:  input.processId,
    userId:     input.userId,
    title:      input.title,
    description: input.description ?? null,
    stepOrder:  input.stepOrder,
    stepType:   input.stepType,
    isRequired: input.isRequired ?? true,
    isBlocking: input.isBlocking ?? false,
    assigneeId: input.assigneeId ?? null,
    status:     "pending",
  }).returning()) as any[];

  // Bump step_count on stage
  await db.execute(sql`
    UPDATE process_stages SET step_count = step_count + 1 WHERE stage_id = ${input.stageId}
  `);

  return rows[0];
}
