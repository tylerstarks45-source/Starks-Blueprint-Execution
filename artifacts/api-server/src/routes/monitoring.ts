import { Router, type IRouter } from "express";
import { eq, and, desc, gt, isNotNull, or } from "drizzle-orm";
import { serialize } from "../lib/serialize";
import {
  db,
  systemInstancesTable,
  businessesTable,
  businessOperationsSettingsTable,
  usersTable,
  runtimeJobsTable,
  scheduledTasksTable,
  DEFAULT_OPERATIONS_PERMISSIONS,
  type HealthIssue,
} from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { hasOperationsModeAccess } from "../lib/operations-gate";
import {
  computeSystemHealth,
  computeBusinessHealth,
  getLatestSystemHealth,
  getSystemHealthHistory,
  getLatestBusinessHealth,
  getBusinessHealthHistory,
} from "../lib/health-monitor";
import { attemptSelfHeal } from "../lib/self-healing";
import { loadCredentials } from "../lib/runtime/worker";
import { findOwnedBusiness } from "../lib/governance/ownership";
import {
  GetSystemMonitoringParams,
  RecomputeSystemMonitoringParams,
  GetBusinessMonitoringParams,
  RecomputeBusinessMonitoringParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// NOTE: intentionally separate from the governed findOwnedBusiness import
// above — system instances are a distinct, ungoverned resource type (out of
// Phase A scope). Do not merge these.
async function findOwnedSystemInstance(id: number, ownerId: number) {
  const [instance] = await db
    .select()
    .from(systemInstancesTable)
    .where(and(eq(systemInstancesTable.id, id), eq(systemInstancesTable.userId, ownerId)));
  return instance ?? null;
}

// Mirrors the tier gate `attemptSelfHeal` enforces at execution time
// (Operator/Empire + autoFixLowRisk permission), so the UI's "self-healing
// disabled" messaging always matches what the backend will actually do —
// a stored autoFixLowRisk=true alone is not sufficient if the owner's
// subscription no longer carries Operations Mode access.
async function canAutoFixForSystemInstance(systemInstanceId: number): Promise<boolean> {
  const [business] = await db
    .select({ id: businessesTable.id, ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.systemInstanceId, systemInstanceId))
    .limit(1);
  if (!business) return false;

  const [settings] = await db
    .select()
    .from(businessOperationsSettingsTable)
    .where(eq(businessOperationsSettingsTable.businessId, business.id))
    .limit(1);
  const permissionAllowed = settings?.enabled
    ? (settings.permissions as typeof DEFAULT_OPERATIONS_PERMISSIONS).autoFixLowRisk === true
    : DEFAULT_OPERATIONS_PERMISSIONS.autoFixLowRisk === true;
  if (!permissionAllowed) return false;

  const [owner] = await db
    .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, business.ownerId));
  return hasOperationsModeAccess(owner?.membershipTier, owner?.role);
}

// ─── Dashboard summary signals (current tasks, warnings/errors, last
// successful run, next scheduled task) — shown alongside the per-dimension
// scores on both the system instance and business Health Dashboard cards.

interface MonitoringSummary {
  currentTasks: number;
  warningsCount: number;
  errorsCount: number;
  lastSuccessfulRun: Date | null;
  nextScheduledTask: { id: number; name: string; nextRunAt: Date } | null;
}

async function buildMonitoringSummary(
  systemInstanceId: number | null,
  issues: HealthIssue[],
): Promise<MonitoringSummary> {
  const warningsCount = issues.filter((i) => i.severity === "low").length;
  const errorsCount = issues.filter((i) => i.severity === "high").length;

  if (systemInstanceId == null) {
    return { currentTasks: 0, warningsCount, errorsCount, lastSuccessfulRun: null, nextScheduledTask: null };
  }

  const activeJobs = await db
    .select({ id: runtimeJobsTable.id })
    .from(runtimeJobsTable)
    .where(
      and(
        eq(runtimeJobsTable.systemInstanceId, systemInstanceId),
        or(eq(runtimeJobsTable.status, "queued"), eq(runtimeJobsTable.status, "active")),
      ),
    );

  const [lastCompletedJob] = await db
    .select({ completedAt: runtimeJobsTable.completedAt })
    .from(runtimeJobsTable)
    .where(and(eq(runtimeJobsTable.systemInstanceId, systemInstanceId), eq(runtimeJobsTable.status, "completed"), isNotNull(runtimeJobsTable.completedAt)))
    .orderBy(desc(runtimeJobsTable.completedAt))
    .limit(1);

  const [lastSuccessfulScheduledTask] = await db
    .select({ lastRunAt: scheduledTasksTable.lastRunAt })
    .from(scheduledTasksTable)
    .where(and(eq(scheduledTasksTable.systemInstanceId, systemInstanceId), eq(scheduledTasksTable.lastRunStatus, "success"), isNotNull(scheduledTasksTable.lastRunAt)))
    .orderBy(desc(scheduledTasksTable.lastRunAt))
    .limit(1);

  const candidates = [lastCompletedJob?.completedAt, lastSuccessfulScheduledTask?.lastRunAt].filter(
    (d): d is Date => d != null,
  );
  const lastSuccessfulRun = candidates.length
    ? new Date(Math.max(...candidates.map((d) => d.getTime())))
    : null;

  const [nextTask] = await db
    .select({ id: scheduledTasksTable.id, name: scheduledTasksTable.name, nextRunAt: scheduledTasksTable.nextRunAt })
    .from(scheduledTasksTable)
    .where(and(eq(scheduledTasksTable.systemInstanceId, systemInstanceId), eq(scheduledTasksTable.enabled, true), isNotNull(scheduledTasksTable.nextRunAt), gt(scheduledTasksTable.nextRunAt, new Date())))
    .orderBy(scheduledTasksTable.nextRunAt)
    .limit(1);

  return {
    currentTasks: activeJobs.length,
    warningsCount,
    errorsCount,
    lastSuccessfulRun,
    nextScheduledTask: nextTask && nextTask.nextRunAt ? { id: nextTask.id, name: nextTask.name, nextRunAt: nextTask.nextRunAt } : null,
  };
}

// ─── GET /api/system-instances/:id/monitoring ────────────────────────────────

router.get("/system-instances/:id/monitoring", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetSystemMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const instance = await findOwnedSystemInstance(params.data.id, caller.id);
  if (!instance) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [latest, history, canAutoFix] = await Promise.all([
    getLatestSystemHealth(instance.id),
    getSystemHealthHistory(instance.id),
    canAutoFixForSystemInstance(instance.id),
  ]);
  const summary = await buildMonitoringSummary(instance.id, (latest?.issues as HealthIssue[]) ?? []);

  res.json(serialize({ latest, history, canAutoFix, summary }));
});

// ─── POST /api/system-instances/:id/monitoring/recompute ────────────────────

router.post("/system-instances/:id/monitoring/recompute", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = RecomputeSystemMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const instance = await findOwnedSystemInstance(params.data.id, caller.id);
  if (!instance) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const score = await computeSystemHealth(instance.id);
  const healResults = await attemptSelfHeal(instance.id, loadCredentials);
  const summary = await buildMonitoringSummary(instance.id, (score.issues as HealthIssue[]) ?? []);

  res.json(
    serialize({
      overallScore: score.overallScore,
      status: score.status,
      selfHealActionsTaken: healResults.filter((r) => r.fixed).length,
      summary,
    }),
  );
});

// ─── GET /api/businesses/:id/monitoring ──────────────────────────────────────

router.get("/businesses/:id/monitoring", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [latest, history, canAutoFix] = await Promise.all([
    getLatestBusinessHealth(business.id),
    getBusinessHealthHistory(business.id),
    business.systemInstanceId ? canAutoFixForSystemInstance(business.systemInstanceId) : Promise.resolve(false),
  ]);
  const summary = await buildMonitoringSummary(business.systemInstanceId ?? null, (latest?.issues as HealthIssue[]) ?? []);

  res.json(serialize({ latest, history, canAutoFix, summary }));
});

// ─── POST /api/businesses/:id/monitoring/recompute ───────────────────────────

router.post("/businesses/:id/monitoring/recompute", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = RecomputeBusinessMonitoringParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const metric = await computeBusinessHealth(business.id);
  const healResults = business.systemInstanceId ? await attemptSelfHeal(business.systemInstanceId, loadCredentials) : [];
  const summary = await buildMonitoringSummary(business.systemInstanceId ?? null, (metric.issues as HealthIssue[]) ?? []);

  res.json(
    serialize({
      overallScore: metric.overallScore,
      status: metric.status,
      selfHealActionsTaken: healResults.filter((r) => r.fixed).length,
      summary,
    }),
  );
});

export default router;
