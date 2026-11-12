// ASH missions: long-running goals ASH works on in the background, one step
// per run, persisted so they survive restarts. The runner lives in runner.ts.
import { db, ashMissionsTable, pendingApprovalsTable, type AshMission, type MissionLogEntry, type PendingApproval } from "@workspace/db";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { ownedBusinessIds } from "../empire/assets";

const MAX_LOG = 200;
export const MAX_GOAL_CHARS = 2000;

export const logEntry = (kind: MissionLogEntry["kind"], message: string): MissionLogEntry => ({
  at: new Date().toISOString(),
  kind,
  message: message.slice(0, 2000),
});

export const withLog = (log: MissionLogEntry[] | null | undefined, ...entries: MissionLogEntry[]) =>
  [...(log ?? []), ...entries].slice(-MAX_LOG);

export async function createMission(userId: number, input: { goal: string; businessId?: number | null }):
  Promise<{ mission: AshMission } | { error: string }> {
  const goal = input.goal.trim().slice(0, MAX_GOAL_CHARS);
  if (goal.length < 3) return { error: "Describe the goal" };
  const businessId = input.businessId ?? null;
  if (businessId != null && !(await ownedBusinessIds(userId, [businessId])).has(businessId)) return { error: "Business not found" };
  const [mission] = await db.insert(ashMissionsTable).values({
    userId, businessId, goal, status: "planning", log: [logEntry("status", "Mission created")],
  }).returning();
  return { mission: mission! };
}

export function listMissions(userId: number, limit = 50) {
  return db.select().from(ashMissionsTable).where(eq(ashMissionsTable.userId, userId))
    .orderBy(desc(ashMissionsTable.createdAt)).limit(limit);
}

export async function getMission(userId: number, id: number) {
  const [m] = await db.select().from(ashMissionsTable)
    .where(and(eq(ashMissionsTable.id, id), eq(ashMissionsTable.userId, userId)));
  return m ?? null;
}

export type OwnerMissionAction = "pause" | "resume" | "cancel";

const FROM: Record<OwnerMissionAction, string[]> = {
  pause: ["planning", "running", "waiting_approval", "waiting_owner"],
  resume: ["paused", "waiting_owner", "failed"],
  cancel: ["planning", "running", "waiting_approval", "waiting_owner", "paused", "failed"],
};

export async function ownerMissionAction(userId: number, id: number, action: OwnerMissionAction, note?: string):
  Promise<{ mission: AshMission } | { error: string; status: number }> {
  const m = await getMission(userId, id);
  if (!m) return { error: "Not found", status: 404 };
  if (!FROM[action].includes(m.status)) return { error: `Can't ${action} a ${m.status.replace("_", " ")} mission`, status: 409 };
  const entries = [logEntry("owner", `Owner ${action === "pause" ? "paused" : action === "resume" ? "resumed" : "cancelled"} the mission`)];
  if (note?.trim()) entries.push(logEntry("owner", `Owner note: ${note.trim().slice(0, 1000)}`));
  const patch: Partial<AshMission> = { log: withLog(m.log, ...entries), updatedAt: new Date() };
  if (action === "pause") Object.assign(patch, { status: "paused" });
  if (action === "cancel") Object.assign(patch, { status: "cancelled", completedAt: new Date(), waitingFor: null });
  if (action === "resume") {
    Object.assign(patch, {
      status: m.steps.length ? "running" : "planning",
      // Keep any lease: a step still running from before the pause must finish before another claim.
      waitingFor: null, approvalId: null, failureCount: 0, nextRunAt: new Date(),
      maxStepRuns: m.stepRuns >= m.maxStepRuns ? m.maxStepRuns + 20 : m.maxStepRuns,
    });
  }
  const [row] = await db.update(ashMissionsTable).set(patch)
    .where(and(eq(ashMissionsTable.id, id), inArray(ashMissionsTable.status, FROM[action]))).returning();
  if (!row) return { error: "Mission changed, try again", status: 409 };
  if (action === "cancel") {
    await db.update(pendingApprovalsTable).set({ status: "rejected", resolvedAt: new Date() })
      .where(and(eq(pendingApprovalsTable.userId, userId), eq(pendingApprovalsTable.status, "pending"), missionApproval(id)));
  }
  return { mission: row };
}

const missionApproval = (missionId: number) => sql`${pendingApprovalsTable.payload}->>'missionId' = ${String(missionId)}`;

/** Records the owner's decision on an approval a mission raised, and resumes the mission if it was waiting on it. */
export async function onApprovalResolved(approval: PendingApproval, approved: boolean, detail?: string): Promise<void> {
  const missionId = Number((approval.payload as Record<string, unknown> | null)?.["missionId"]);
  if (!Number.isInteger(missionId)) return;
  // Row lock: approvals resolved together each add their note to the latest steps instead of overwriting one another.
  await db.transaction(async (tx) => {
    const [m] = await tx.select().from(ashMissionsTable)
      .where(and(eq(ashMissionsTable.id, missionId), eq(ashMissionsTable.userId, approval.userId))).for("update");
    if (!m) return;
    const message = approved
      ? `Owner approved "${approval.title}"${detail ? ` — ${detail.slice(0, 300)}` : ""}`
      : `Owner rejected "${approval.title}". Find another way or skip it.`;
    const note = approved
      ? `Already done (owner approved, do not repeat): ${approval.title}`
      : `Owner rejected, do not retry: ${approval.title}`;
    const idx = m.steps.findIndex((s) => s.status === "pending");
    const steps = idx < 0 ? m.steps : m.steps.map((s, i) => (i === idx ? { ...s, notes: [...(s.notes ?? []), note].slice(-20) } : s));
    // One step can queue several actions; keep waiting until all of them are decided.
    const [next] = await tx.select({ id: pendingApprovalsTable.id }).from(pendingApprovalsTable)
      .where(and(eq(pendingApprovalsTable.userId, approval.userId), eq(pendingApprovalsTable.status, "pending"),
        ne(pendingApprovalsTable.id, approval.id), missionApproval(m.id)))
      .orderBy(asc(pendingApprovalsTable.id)).limit(1);
    const base = { log: withLog(m.log, logEntry("approval", message)), steps, updatedAt: new Date() };
    if (m.status !== "waiting_approval") {
      await tx.update(ashMissionsTable).set(base).where(eq(ashMissionsTable.id, m.id));
      return;
    }
    await tx.update(ashMissionsTable).set(next
      ? { ...base, approvalId: next.id }
      : { ...base, status: "running", approvalId: null, waitingFor: null, nextRunAt: new Date() })
      .where(and(eq(ashMissionsTable.id, m.id), eq(ashMissionsTable.status, "waiting_approval")));
  });
}
