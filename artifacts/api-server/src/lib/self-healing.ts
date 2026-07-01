import { eq, and, inArray, lt } from "drizzle-orm";
import {
  db,
  systemConnectorsTable,
  runtimeJobsTable,
  businessesTable,
  businessOperationsSettingsTable,
  type OperationsPermissions,
  DEFAULT_OPERATIONS_PERMISSIONS,
} from "@workspace/db";
import { getConnector } from "./connectors/registry";
import { logger } from "./logger";
import { logMonitoringEvent } from "./health-monitor";
import { createPendingApproval } from "./approvals";

const STUCK_JOB_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes "active" with no progress

// Whitelisted low-risk self-healing actions. Each is a pure-ish function
// with a clear precondition (what's broken) and postcondition (what "fixed"
// means) — see task-246 step 3. Anything outside this whitelist (e.g. novel
// failures needing root-cause research) is explicitly out of scope.

export interface SelfHealResult {
  action: string;
  attempted: boolean;
  fixed: boolean;
  detail: string;
}

// Resolve Operations Mode permissions for the business that owns a system
// instance (if any). Systems with no owning business, or no operations
// settings row yet, are treated as monitor-only (no auto-fix permission).
async function resolvePermissions(systemInstanceId: number): Promise<{ businessId: number | null; permissions: OperationsPermissions }> {
  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.systemInstanceId, systemInstanceId))
    .limit(1);

  if (!business) return { businessId: null, permissions: DEFAULT_OPERATIONS_PERMISSIONS };

  const [settings] = await db
    .select()
    .from(businessOperationsSettingsTable)
    .where(eq(businessOperationsSettingsTable.businessId, business.id))
    .limit(1);

  if (!settings || !settings.enabled) return { businessId: business.id, permissions: DEFAULT_OPERATIONS_PERMISSIONS };
  return { businessId: business.id, permissions: settings.permissions as OperationsPermissions };
}

// ─── Fix #1: reconnect an expired/errored connector ────────────────────────
// Precondition: a system_connector row has status 'error'.
// Postcondition: re-testing with the currently stored credentials succeeds
// and the row is updated to 'connected'. If it still fails, we can't fix it
// without new credentials from the user — that's an escalation, not a retry
// loop, since there's no stored refresh-token flow to fall back on.
async function reconnectExpiredConnector(
  systemInstanceId: number,
  connectorId: string,
  loadCredentials: (systemInstanceId: number) => Promise<Record<string, string>>,
): Promise<SelfHealResult> {
  const creds = await loadCredentials(systemInstanceId);
  const connector = getConnector(connectorId, creds);
  if (!connector) {
    return { action: "reconnect", attempted: true, fixed: false, detail: `Unknown connector ${connectorId}` };
  }

  const result = await connector.testConnection();
  await db
    .update(systemConnectorsTable)
    .set({
      status: result.ok ? "connected" : "error",
      lastTestedAt: new Date(),
      errorMessage: result.ok ? null : result.message,
    })
    .where(and(eq(systemConnectorsTable.systemInstanceId, systemInstanceId), eq(systemConnectorsTable.connector, connectorId)));

  return {
    action: "reconnect",
    attempted: true,
    fixed: result.ok,
    detail: result.ok ? `${connectorId} reconnected` : `${connectorId} still failing: ${result.message}`,
  };
}

// ─── Fix #2: retry a failed runtime_job ────────────────────────────────────
// Precondition: job status = 'failed', not already retried by self-heal
// (attempt < maxAttempts + 1 guard avoids infinite loops).
// Postcondition: job requeued with status 'queued', attempt reset so the
// worker's normal retry/backoff logic re-runs it fresh.
async function retryFailedJob(jobId: string): Promise<SelfHealResult> {
  const [job] = await db.select().from(runtimeJobsTable).where(eq(runtimeJobsTable.jobId, jobId)).limit(1);
  if (!job || job.status !== "failed") {
    return { action: "retry_job", attempted: false, fixed: false, detail: `Job ${jobId} not in a retryable state` };
  }

  await db
    .update(runtimeJobsTable)
    .set({ status: "queued", attempt: 0, error: null, startedAt: null, completedAt: null })
    .where(eq(runtimeJobsTable.jobId, jobId));

  return { action: "retry_job", attempted: true, fixed: true, detail: `Requeued failed job ${jobId}` };
}

// ─── Fix #3: clear a stuck queue entry ─────────────────────────────────────
// Precondition: job status = 'active' with startedAt older than the stuck
// threshold (the worker process that claimed it likely crashed/restarted).
// Postcondition: job moved back to 'queued' so the next worker tick claims
// it again — same recovery `resetOrphanedJobs()` does at startup, applied
// live during monitoring.
async function clearStuckJob(jobId: string): Promise<SelfHealResult> {
  const [job] = await db.select().from(runtimeJobsTable).where(eq(runtimeJobsTable.jobId, jobId)).limit(1);
  if (!job || job.status !== "active" || !job.startedAt) {
    return { action: "clear_stuck", attempted: false, fixed: false, detail: `Job ${jobId} not stuck` };
  }
  if (Date.now() - job.startedAt.getTime() < STUCK_JOB_THRESHOLD_MS) {
    return { action: "clear_stuck", attempted: false, fixed: false, detail: `Job ${jobId} not old enough yet` };
  }

  await db
    .update(runtimeJobsTable)
    .set({ status: "queued", startedAt: null })
    .where(eq(runtimeJobsTable.jobId, jobId));

  return { action: "clear_stuck", attempted: true, fixed: true, detail: `Cleared stuck job ${jobId}` };
}

// ─── Orchestrator ───────────────────────────────────────────────────────────
// Scans a system instance for whitelisted-fixable problems and either runs
// the fix (if Operations Mode + autoFixLowRisk is granted), or logs a
// read-only "here's what's wrong" entry, or escalates to Pending Approval
// when the issue is outside the low-risk whitelist.

export async function attemptSelfHeal(
  systemInstanceId: number,
  loadCredentials: (systemInstanceId: number) => Promise<Record<string, string>>,
): Promise<SelfHealResult[]> {
  const { businessId, permissions } = await resolvePermissions(systemInstanceId);
  const canAutoFix = permissions.autoFixLowRisk === true;

  const results: SelfHealResult[] = [];

  const erroredConnectors = await db
    .select()
    .from(systemConnectorsTable)
    .where(and(eq(systemConnectorsTable.systemInstanceId, systemInstanceId), eq(systemConnectorsTable.status, "error")));

  for (const connector of erroredConnectors) {
    if (!canAutoFix) {
      await logMonitoringEvent({
        systemInstanceId,
        businessId,
        eventType: "health_check",
        action: "reconnect",
        status: "skipped",
        message: `Connector ${connector.connector} needs reconnecting but auto-fix is not enabled`,
      });
      continue;
    }
    const result = await reconnectExpiredConnector(systemInstanceId, connector.connector, loadCredentials);
    results.push(result);
    await logMonitoringEvent({
      systemInstanceId,
      businessId,
      eventType: "self_heal",
      action: result.action,
      status: result.fixed ? "success" : "failed",
      message: result.detail,
    });

    if (!result.fixed && businessId) {
      await createPendingApproval({
        businessId,
        userId: (await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1))[0]?.ownerId ?? 0,
        category: "autoFixHighRisk",
        riskLevel: "high",
        title: `Reconnect ${connector.connector} manually`,
        description: `Auto-reconnect failed for ${connector.connector}: ${result.detail}. This likely needs updated credentials.`,
        payload: { systemInstanceId, connectorId: connector.connector },
      });
      await logMonitoringEvent({
        systemInstanceId,
        businessId,
        eventType: "escalated",
        action: "reconnect",
        status: "escalated",
        message: `Escalated unfixable connector ${connector.connector} to Pending Approval`,
      });
    }
  }

  const failedJobs = await db
    .select()
    .from(runtimeJobsTable)
    .where(and(eq(runtimeJobsTable.systemInstanceId, systemInstanceId), eq(runtimeJobsTable.status, "failed")));

  for (const job of failedJobs) {
    if (job.attempt >= job.maxAttempts + 1) continue; // already retried by self-heal once — avoid infinite loop
    if (!canAutoFix) {
      await logMonitoringEvent({
        systemInstanceId,
        businessId,
        eventType: "health_check",
        action: "retry_job",
        status: "skipped",
        message: `Job ${job.jobId} (${job.jobType}) failed but auto-fix is not enabled`,
      });
      continue;
    }
    const result = await retryFailedJob(job.jobId);
    if (result.attempted) results.push(result);
    await logMonitoringEvent({
      systemInstanceId,
      businessId,
      eventType: "self_heal",
      action: result.action,
      status: result.fixed ? "success" : "failed",
      message: result.detail,
      metadata: { jobId: job.jobId, jobType: job.jobType },
    });
  }

  const stuckThreshold = new Date(Date.now() - STUCK_JOB_THRESHOLD_MS);
  const stuckJobs = await db
    .select()
    .from(runtimeJobsTable)
    .where(
      and(
        eq(runtimeJobsTable.systemInstanceId, systemInstanceId),
        eq(runtimeJobsTable.status, "active"),
        lt(runtimeJobsTable.startedAt, stuckThreshold),
      ),
    );

  for (const job of stuckJobs) {
    if (!canAutoFix) {
      await logMonitoringEvent({
        systemInstanceId,
        businessId,
        eventType: "health_check",
        action: "clear_stuck",
        status: "skipped",
        message: `Job ${job.jobId} (${job.jobType}) appears stuck but auto-fix is not enabled`,
      });
      continue;
    }
    const result = await clearStuckJob(job.jobId);
    if (result.attempted) results.push(result);
    await logMonitoringEvent({
      systemInstanceId,
      businessId,
      eventType: "self_heal",
      action: result.action,
      status: result.fixed ? "success" : "failed",
      message: result.detail,
      metadata: { jobId: job.jobId, jobType: job.jobType },
    });
  }

  if (results.length > 0) {
    logger.info({ systemInstanceId, results }, "Self-healing pass completed");
  }

  return results;
}

export { STUCK_JOB_THRESHOLD_MS };
