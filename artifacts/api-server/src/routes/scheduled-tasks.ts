import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, scheduledTasksTable, systemInstancesTable } from "@workspace/db";
import { z } from "zod/v4";
import { getActiveCallerPayload, requireAuthActive, isAdminRole } from "../lib/auth";
const router: IRouter = Router();

// ─── Schedule type helpers ────────────────────────────────────────────────────

const SCHEDULE_TYPES = ["every_n_minutes", "every_n_hours", "daily", "weekly"] as const;
type ScheduleType = (typeof SCHEDULE_TYPES)[number];

// Compute next run time from a schedule config.
// Returns the nearest future occurrence — could be today/this-week if the
// target time hasn't passed yet, or the next period otherwise.
export function computeNextRunAt(scheduleType: ScheduleType, scheduleConfig: Record<string, unknown>, from: Date = new Date()): Date {
  switch (scheduleType) {
    case "every_n_minutes": {
      const n = Math.max(1, Number(scheduleConfig["intervalMinutes"] ?? 15));
      const next = new Date(from);
      next.setMinutes(next.getMinutes() + n, 0, 0);
      return next;
    }
    case "every_n_hours": {
      const n = Math.max(1, Number(scheduleConfig["intervalHours"] ?? 1));
      const next = new Date(from);
      next.setHours(next.getHours() + n, 0, 0, 0);
      return next;
    }
    case "daily": {
      // scheduleConfig: { hour: 9, minute: 0 }  (UTC)
      const hour = Number(scheduleConfig["hour"] ?? 9);
      const minute = Number(scheduleConfig["minute"] ?? 0);
      // Try today's occurrence first — use it if it's still in the future
      const candidate = new Date(from);
      candidate.setHours(hour, minute, 0, 0);
      if (candidate > from) return candidate;
      // Already past today → schedule for tomorrow
      candidate.setDate(candidate.getDate() + 1);
      return candidate;
    }
    case "weekly": {
      // scheduleConfig: { dayOfWeek: 1 (Mon=1..Sun=7), hour: 9, minute: 0 }
      const targetDay = Number(scheduleConfig["dayOfWeek"] ?? 1);
      const hour = Number(scheduleConfig["hour"] ?? 9);
      const minute = Number(scheduleConfig["minute"] ?? 0);
      const curDay = from.getDay() === 0 ? 7 : from.getDay();
      // Try this-week's occurrence (daysUntil may be 0 = today, or positive = later this week)
      const daysUntilThisWeek = targetDay - curDay;
      const candidate = new Date(from);
      candidate.setDate(candidate.getDate() + daysUntilThisWeek);
      candidate.setHours(hour, minute, 0, 0);
      if (candidate > from) return candidate;
      // This-week occurrence already passed → advance to next week
      candidate.setDate(candidate.getDate() + 7);
      return candidate;
    }
  }
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const ScheduleConfigSchema = z.record(z.string(), z.unknown());
const ActionParamsSchema = z.record(z.string(), z.unknown());

const CreateScheduledTaskBody = z.object({
  name: z.string().min(1).max(200),
  scheduleType: z.enum(SCHEDULE_TYPES),
  scheduleConfig: ScheduleConfigSchema,
  actionType: z.string().min(1).max(100).default("connector"),
  actionParams: ActionParamsSchema,
  enabled: z.boolean().default(true),
});

const UpdateScheduledTaskBody = z.object({
  name: z.string().min(1).max(200).optional(),
  scheduleType: z.enum(SCHEDULE_TYPES).optional(),
  scheduleConfig: ScheduleConfigSchema.optional(),
  actionType: z.string().min(1).max(100).optional(),
  actionParams: ActionParamsSchema.optional(),
  enabled: z.boolean().optional(),
});

// ─── Ownership helper ─────────────────────────────────────────────────────────

async function verifySystemOwnership(
  systemInstanceId: number,
  callerId: number,
  isAdmin: boolean,
  res: import("express").Response,
): Promise<boolean> {
  const [instance] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return false; }
  if (!isAdmin && instance.userId !== null && instance.userId !== callerId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// ─── GET /api/system-instances/:systemInstanceId/scheduled-tasks ──────────────

router.get("/system-instances/:systemInstanceId/scheduled-tasks", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const systemInstanceId = Number(req.params.systemInstanceId);
  if (isNaN(systemInstanceId)) { res.status(400).json({ error: "Invalid systemInstanceId" }); return; }

  const isAdmin = isAdminRole(caller.role);
  if (!(await verifySystemOwnership(systemInstanceId, caller.id, isAdmin, res))) return;

  const rows = await db
    .select()
    .from(scheduledTasksTable)
    .where(eq(scheduledTasksTable.systemInstanceId, systemInstanceId))
    .orderBy(desc(scheduledTasksTable.createdAt));

  res.json(serialize(rows));
});

// ─── POST /api/system-instances/:systemInstanceId/scheduled-tasks ─────────────

router.post("/system-instances/:systemInstanceId/scheduled-tasks", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const systemInstanceId = Number(req.params.systemInstanceId);
  if (isNaN(systemInstanceId)) { res.status(400).json({ error: "Invalid systemInstanceId" }); return; }

  const [instance] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (instance.userId !== null && instance.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = CreateScheduledTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const nextRunAt = computeNextRunAt(
    parsed.data.scheduleType,
    parsed.data.scheduleConfig as Record<string, unknown>,
    new Date(),
  );

  const [row] = await db
    .insert(scheduledTasksTable)
    .values({
      systemInstanceId,
      userId,
      name: parsed.data.name,
      scheduleType: parsed.data.scheduleType,
      scheduleConfig: parsed.data.scheduleConfig as Record<string, unknown>,
      actionType: parsed.data.actionType,
      actionParams: parsed.data.actionParams as Record<string, unknown>,
      enabled: parsed.data.enabled,
      nextRunAt,
    })
    .returning();

  res.status(201).json(serialize(row));
});

// ─── PATCH /api/scheduled-tasks/:id ──────────────────────────────────────────

router.patch("/scheduled-tasks/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const taskId = Number(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }

  const [existing] = await db
    .select()
    .from(scheduledTasksTable)
    .where(eq(scheduledTasksTable.id, taskId));
  if (!existing) { res.status(404).json({ error: "Scheduled task not found" }); return; }

  const isAdmin = isAdminRole(caller.role);
  if (!isAdmin && existing.userId !== caller.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = UpdateScheduledTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const scheduleType = (parsed.data.scheduleType ?? existing.scheduleType) as ScheduleType;
  const scheduleConfig = (parsed.data.scheduleConfig ?? existing.scheduleConfig) as Record<string, unknown>;

  const updatedNextRunAt =
    (parsed.data.scheduleType || parsed.data.scheduleConfig || parsed.data.enabled === true)
      ? computeNextRunAt(scheduleType, scheduleConfig, new Date())
      : existing.nextRunAt;

  const [row] = await db
    .update(scheduledTasksTable)
    .set({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.scheduleType !== undefined ? { scheduleType: parsed.data.scheduleType } : {}),
      ...(parsed.data.scheduleConfig !== undefined ? { scheduleConfig: parsed.data.scheduleConfig as Record<string, unknown> } : {}),
      ...(parsed.data.actionType !== undefined ? { actionType: parsed.data.actionType } : {}),
      ...(parsed.data.actionParams !== undefined ? { actionParams: parsed.data.actionParams as Record<string, unknown> } : {}),
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      nextRunAt: updatedNextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(scheduledTasksTable.id, taskId))
    .returning();

  res.json(serialize(row));
});

// ─── DELETE /api/scheduled-tasks/:id ─────────────────────────────────────────

router.delete("/scheduled-tasks/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const taskId = Number(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }

  const [existing] = await db
    .select()
    .from(scheduledTasksTable)
    .where(eq(scheduledTasksTable.id, taskId));
  if (!existing) { res.status(404).json({ error: "Scheduled task not found" }); return; }

  const isAdmin = isAdminRole(caller.role);
  if (!isAdmin && existing.userId !== caller.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(scheduledTasksTable).where(eq(scheduledTasksTable.id, taskId));
  res.sendStatus(204);
});

// ─── GET /api/scheduled-tasks/stats (admin) ───────────────────────────────────

router.get("/scheduled-tasks/stats", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  if (!isAdminRole(caller.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(scheduledTasksTable)
    .where(eq(scheduledTasksTable.enabled, true));

  res.json({ activeScheduledTasksCount: total ?? 0 });
});

export default router;
export { computeNextRunAt as _computeNextRunAt };
