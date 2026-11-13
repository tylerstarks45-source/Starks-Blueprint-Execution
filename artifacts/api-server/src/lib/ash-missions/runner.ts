// Background runner for ASH missions. Each run claims a few due missions with a
// lease (safe across replicas), does one step of each, and writes progress back.
import { db, ashMissionsTable, type AshMission, type MissionStep } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { complete } from "../openrouter";
import { chainFor, chainForAgentMode } from "../models";
import { OutOfCreditsError, DailyAiLimitError } from "../credits";
import { logger } from "../logger";
import { runAshAgent, type AgentStep } from "../ash-agent";
import { MISSION_TOOL_NAMES } from "../ash-agent/tools";
import { getEffectiveControl, toolActionKind } from "../ash-control/policy";
import { logEntry, withLog } from "./index";

const POLL_MS = 20_000;
const BATCH = 3;
const STEP_PACE_MS = 15_000;
const MAX_FAILURES = 3;
const MAX_PLAN_STEPS = 8;

let running = false;
let timer: NodeJS.Timeout | null = null;
const active = new Set<Promise<void>>();

export async function claimDueMissions(limit = BATCH): Promise<AshMission[]> {
  const res = await db.execute(sql`
    update ash_missions set lease_until = now() + interval '10 minutes'
    where id in (
      select id from ash_missions
      where status in ('planning', 'running') and next_run_at <= now()
        and (lease_until is null or lease_until < now())
      order by next_run_at limit ${limit}
      for update skip locked
    ) returning id`);
  const ids = (res.rows as Array<{ id: number }>).map((r) => Number(r.id));
  if (!ids.length) return [];
  return db.select().from(ashMissionsTable).where(inArray(ashMissionsTable.id, ids));
}

// Writes the run's outcome unless the owner paused/cancelled the mission meanwhile.
async function finish(m: AshMission, patch: Partial<AshMission>): Promise<void> {
  const updated = await db.update(ashMissionsTable)
    .set({ ...patch, leaseUntil: null, updatedAt: new Date() })
    .where(and(eq(ashMissionsTable.id, m.id), inArray(ashMissionsTable.status, ["planning", "running"])))
    .returning({ id: ashMissionsTable.id });
  if (updated.length) return;
  // Owner changed the status mid-run: keep their status, record what happened.
  const [current] = await db.select().from(ashMissionsTable).where(eq(ashMissionsTable.id, m.id));
  if (!current) return;
  const newEntries = (patch.log ?? []).slice((m.log ?? []).length);
  await db.update(ashMissionsTable).set({
    leaseUntil: null, updatedAt: new Date(), log: withLog(current.log, ...newEntries),
    ...(patch.steps ? { steps: patch.steps } : {}),
  }).where(eq(ashMissionsTable.id, m.id));
}

// Calls that failed and weren't retried successfully (same tool, same arguments) later in the same turn.
const sameCall = (a: AgentStep, b: AgentStep) => a.tool === b.tool && a.args === b.args;
const unresolvedFailures = (steps: AgentStep[]) =>
  [...new Set(steps.filter((s, i) => !s.ok && !steps.slice(i + 1).some((t) => sameCall(t, s) && t.ok)).map((s) => s.tool))];

/** A step that stopped partway: carries the step list with notes of what already succeeded, so the retry doesn't redo it. */
class StepIncomplete extends Error {
  constructor(message: string, readonly steps: MissionStep[]) { super(message); }
}

function parsePlan(text: string): string[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { steps?: unknown };
    return Array.isArray(parsed.steps)
      ? parsed.steps.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim().slice(0, 300)).slice(0, MAX_PLAN_STEPS)
      : [];
  } catch {
    return [];
  }
}

const levelNote = async (m: AshMission) => {
  const c = await getEffectiveControl(m.userId, m.businessId);
  return `Owner's ASH Control level: ${c.level}. Actions that need approval are queued for the owner automatically; when a tool returns awaiting_approval, stop and summarize.`;
};

async function planMission(m: AshMission): Promise<Partial<AshMission>> {
  const result = await complete({
    userId: m.userId,
    models: chainFor("reasoning"),
    systemPrompt: `You are ASH planning a mission for a business owner. Break the goal into 3-${MAX_PLAN_STEPS} concrete steps you can carry out with these tools: ${MISSION_TOOL_NAMES.join(", ")}. Steps that need things you can't do yet (external launches, payments, logins) should be phrased as preparing the work and asking the owner. Reply with JSON only: {"steps": ["..."]}`,
    prompt: `Goal: ${m.goal}${m.businessId != null ? `\nBusiness id: ${m.businessId}` : ""}`,
  });
  const titles = parsePlan(result.content);
  if (!titles.length) throw new Error("Planner returned no steps");
  const steps: MissionStep[] = titles.map((title) => ({ title, status: "pending" }));
  return {
    status: "running", steps, failureCount: 0, nextRunAt: new Date(),
    log: withLog(m.log, logEntry("plan", `Plan: ${titles.map((t, i) => `${i + 1}. ${t}`).join(" ")}`)),
  };
}

async function runStep(m: AshMission): Promise<Partial<AshMission>> {
  const idx = m.steps.findIndex((s) => s.status === "pending");
  if (idx < 0) {
    return { status: "completed", completedAt: new Date(), log: withLog(m.log, logEntry("status", "All steps done")) };
  }
  if (m.stepRuns >= m.maxStepRuns) {
    return { status: "paused", waitingFor: "Step budget used up. Resume to let ASH keep going.", log: withLog(m.log, logEntry("status", "Paused: step budget used up")) };
  }
  const notes = m.steps[idx]!.notes ?? [];
  const done = m.steps.map((s, i) => `${i + 1}. [${s.status}] ${s.title}${s.result ? ` → ${s.result.slice(0, 300)}` : ""}`).join("\n");
  const recent = (m.log ?? []).slice(-8).map((e) => `- ${e.kind}: ${e.message.slice(0, 300)}`).join("\n");
  const result = await runAshAgent({
    userId: m.userId,
    systemPrompt: `You are ASH working on a long-running mission for the owner, in the background (the owner isn't watching). Do only the current step, using tools. Never invent results. If the step needs something only the owner can do (log in, pay, verify identity, accept terms), call request_owner_action. Finish with a 1-3 sentence summary of what you did.\n${await levelNote(m)}`,
    messages: [{
      role: "user",
      content: `Mission goal: ${m.goal}${m.businessId != null ? `\nBusiness id: ${m.businessId}` : ""}\n\nPlan:\n${done}\n\nRecent activity:\n${recent || "- none"}\n\nCurrent step ${idx + 1}: ${m.steps[idx]!.title}${notes.length ? `\nAlready handled in this step:\n${notes.map((n) => `- ${n}`).join("\n")}` : ""}`,
    }],
    models: chainForAgentMode("business"),
    maxSteps: 6,
    toolNames: MISSION_TOOL_NAMES,
    control: { interactive: false, missionId: m.id, businessId: m.businessId },
  });
  const toolLog = result.steps.filter((s) => s.tool !== "request_owner_action")
    .map((s) => logEntry("tool", `${s.tool}${s.approvalId ? " → queued for approval" : s.ok ? "" : " failed"}`));
  const approvals = result.steps.filter((s) => s.approvalId != null);
  const approval = approvals[0];
  const ownerAsk = result.steps.find((s) => s.tool === "request_owner_action" && s.note);
  const base = { stepRuns: m.stepRuns + 1, failureCount: 0 };
  if (approval) {
    return { ...base, status: "waiting_approval", approvalId: approval.approvalId!, waitingFor: approvals.length > 1 ? `${approvals.length} actions waiting in your Approvals inbox` : "Your approval in the Approvals inbox",
      log: withLog(m.log, ...toolLog, logEntry("approval", `Waiting for approval: ${result.content.slice(0, 500)}`)) };
  }
  if (ownerAsk) {
    return { ...base, status: "waiting_owner", waitingFor: ownerAsk.note!.slice(0, 1000),
      log: withLog(m.log, ...toolLog, logEntry("owner", `Needs the owner: ${ownerAsk.note!}`)) };
  }
  const failed = unresolvedFailures(result.steps);
  if (failed.length) {
    const doneNotes = result.steps.filter((s) => s.ok && s.args != null && toolActionKind(s.tool) !== "read")
      .map((s) => `Already done in an earlier attempt, do not repeat: ${s.tool} ${s.args!.slice(0, 200)}`);
    const steps = m.steps.map((s, i) => (i === idx ? { ...s, notes: [...(s.notes ?? []), ...doneNotes].slice(-20) } : s));
    throw new StepIncomplete(`Step not finished: ${failed.join(", ")} failed`, steps);
  }
  const steps = m.steps.map((s, i) => (i === idx ? { ...s, status: "done" as const, result: result.content.slice(0, 1500) } : s));
  const allDone = steps.every((s) => s.status !== "pending");
  return {
    ...base, steps,
    status: allDone ? "completed" : "running",
    ...(allDone ? { completedAt: new Date() } : {}),
    nextRunAt: new Date(Date.now() + STEP_PACE_MS),
    log: withLog(m.log, ...toolLog, logEntry("step", `Step ${idx + 1} done: ${result.content.slice(0, 800)}`),
      ...(allDone ? [logEntry("status", "Mission completed")] : [])),
  };
}

export async function runMissionOnce(m: AshMission): Promise<void> {
  try {
    await finish(m, m.status === "planning" ? await planMission(m) : await runStep(m));
  } catch (err) {
    if (err instanceof OutOfCreditsError || err instanceof DailyAiLimitError) {
      await finish(m, { status: "paused", waitingFor: err.message, log: withLog(m.log, logEntry("status", `Paused: ${err.message}`)) });
      return;
    }
    const failures = m.failureCount + 1;
    const message = err instanceof Error ? err.message : String(err);
    const keep = err instanceof StepIncomplete ? { steps: err.steps } : {};
    logger.warn({ missionId: m.id, err: message }, "ASH mission step failed");
    await finish(m, failures >= MAX_FAILURES
      ? { ...keep, status: "failed", failureCount: failures, waitingFor: "Failed 3 times in a row. Resume to retry.", log: withLog(m.log, logEntry("error", `Failed: ${message.slice(0, 300)}`)) }
      : { ...keep, failureCount: failures, nextRunAt: new Date(Date.now() + 60_000 * 2 ** failures), log: withLog(m.log, logEntry("error", `Retrying after error: ${message.slice(0, 300)}`)) });
  }
}

async function poll(): Promise<void> {
  try {
    const missions = await claimDueMissions();
    for (const m of missions) {
      const p = runMissionOnce(m).finally(() => active.delete(p));
      active.add(p);
    }
  } catch (err) {
    logger.error({ err }, "ASH mission poll failed");
  } finally {
    if (running) timer = setTimeout(poll, POLL_MS);
  }
}

export function startMissionRunner(): void {
  if (running) return;
  running = true;
  timer = setTimeout(poll, POLL_MS);
  logger.info({ pollMs: POLL_MS }, "ASH mission runner started");
}

// Resolves once in-flight mission steps finish.
export async function stopMissionRunner(): Promise<void> {
  running = false;
  if (timer) clearTimeout(timer);
  await Promise.allSettled([...active]);
}
