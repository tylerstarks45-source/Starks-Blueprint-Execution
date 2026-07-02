import { eq, and, or, lt, gt, inArray, isNotNull, sql } from "drizzle-orm";
import {
  db,
  systemConnectorsTable,
  runtimeJobsTable,
  businessesTable,
  businessOperationsSettingsTable,
  pendingApprovalsTable,
  systemInstancesTable,
  monitoringLogEventsTable,
  userCredentialsTable,
  usersTable,
  type OperationsPermissions,
  DEFAULT_OPERATIONS_PERMISSIONS,
} from "@workspace/db";
import { getConnector } from "./connectors/registry";
import { logger } from "./logger";
import { logMonitoringEvent } from "./health-monitor";
import { createPendingApproval } from "./approvals";
import { hasOperationsModeAccess } from "./operations-gate";
import { runRootCauseResearch } from "./research-loop";
import { restartSystem, DeploymentError } from "./runtime/deployment";

const STUCK_JOB_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes "active" with no progress
const RESTART_WORKER_COOLDOWN_MS = 30 * 60 * 1000; // don't restart the same worker more than once per 30 minutes

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
//
// canAutoFix additionally enforces the Operator/Empire tier gate
// (hasOperationsModeAccess) on the *owner's current* membershipTier/role —
// not just the stored permissions flag. This matters because a business's
// businessOperationsSettings.permissions row can retain autoFixLowRisk=true
// after the owner's subscription is downgraded below Operator; without this
// check, background self-heal (scheduler tick, event-triggered recompute)
// would keep auto-fixing for an account that no longer has Operations Mode
// entitlement, even though `requireOperationsTier` blocks the settings
// *routes* themselves.
async function resolvePermissions(
  systemInstanceId: number,
): Promise<{ businessId: number | null; ownerId: number | null; canAutoFix: boolean }> {
  const [business] = await db
    .select({ id: businessesTable.id, ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.systemInstanceId, systemInstanceId))
    .limit(1);

  if (!business) return { businessId: null, ownerId: null, canAutoFix: false };

  const [settings] = await db
    .select()
    .from(businessOperationsSettingsTable)
    .where(eq(businessOperationsSettingsTable.businessId, business.id))
    .limit(1);

  const permissions: OperationsPermissions =
    settings?.enabled ? (settings.permissions as OperationsPermissions) : DEFAULT_OPERATIONS_PERMISSIONS;

  const [owner] = await db
    .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, business.ownerId));

  const canAutoFix =
    permissions.autoFixLowRisk === true && hasOperationsModeAccess(owner?.membershipTier, owner?.role);

  return { businessId: business.id, ownerId: business.ownerId, canAutoFix };
}

// ─── Fix #1: reconnect an expired/errored connector ────────────────────────
// Precondition: a system_connector row has status 'error'.
// Postcondition: re-testing with the currently stored credentials succeeds
// and the row is updated to 'connected' — this is the "stored refresh flow":
// we check the user's *stored* credential record (status/expiresAt) rather
// than blindly retrying. If the stored token is genuinely expired, no
// connector in this codebase implements an OAuth refresh-token exchange, so
// retrying testConnection() would just fail identically forever. In that
// case we skip straight to "can't fix, needs new credentials" instead of
// looping — that's an escalation, not a retry loop.
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

  const [instance] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));

  if (instance && connector.requiredCredentials.length > 0) {
    const expiredCred = await db
      .select({ id: userCredentialsTable.id, credentialKey: userCredentialsTable.credentialKey })
      .from(userCredentialsTable)
      .where(
        and(
          eq(userCredentialsTable.userId, instance.userId),
          inArray(userCredentialsTable.credentialKey, connector.requiredCredentials),
          or(
            eq(userCredentialsTable.status, "expired"),
            and(isNotNull(userCredentialsTable.expiresAt), lt(userCredentialsTable.expiresAt, new Date())),
          ),
        ),
      )
      .limit(1);

    if (expiredCred.length > 0) {
      await db
        .update(systemConnectorsTable)
        .set({ status: "error", lastTestedAt: new Date(), errorMessage: "Stored credential is expired" })
        .where(and(eq(systemConnectorsTable.systemInstanceId, systemInstanceId), eq(systemConnectorsTable.connector, connectorId)));

      return {
        action: "reconnect",
        attempted: true,
        fixed: false,
        detail: `${connectorId}'s stored credential (${expiredCred[0]!.credentialKey}) is expired and this connector has no OAuth refresh-token flow — needs a new credential from the user`,
      };
    }
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
// Precondition: job status = 'failed'. Self-heal is bounded to a single
// requeue per job via `selfHealRetryCount` (checked by the caller before
// calling this), since `attempt` gets reset below and can't be used as the
// loop guard on its own.
// Postcondition: job requeued with status 'queued', attempt reset so the
// worker's normal retry/backoff logic re-runs it fresh, selfHealRetryCount
// incremented (never reset) so a second failure escalates instead of
// requeueing again.
async function retryFailedJob(jobId: string): Promise<SelfHealResult> {
  const [job] = await db.select().from(runtimeJobsTable).where(eq(runtimeJobsTable.jobId, jobId)).limit(1);
  if (!job || job.status !== "failed") {
    return { action: "retry_job", attempted: false, fixed: false, detail: `Job ${jobId} not in a retryable state` };
  }

  await db
    .update(runtimeJobsTable)
    .set({
      status: "queued",
      attempt: 0,
      error: null,
      startedAt: null,
      completedAt: null,
      selfHealRetryCount: job.selfHealRetryCount + 1,
    })
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

// ─── Fix #4: restart a crashed worker ──────────────────────────────────────
// Precondition: system_instances.buildStatus = 'failed' (the deployment
// state machine only allows a fresh 'deploying' transition from 'failed',
// 'built', or 'paused' — a system stuck at 'failed' means its worker
// process crashed/exited and needs a fresh deploy to come back up).
// Postcondition: restartSystem() moves it back through built -> deploying,
// same path a user hits via POST /api/runtime/systems/:id/restart.
async function restartWorker(systemInstanceId: number): Promise<SelfHealResult> {
  const [instance] = await db
    .select({ buildStatus: systemInstancesTable.buildStatus })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));

  if (!instance || instance.buildStatus !== "failed") {
    return { action: "restart_worker", attempted: false, fixed: false, detail: `System ${systemInstanceId} is not in a crashed state` };
  }

  try {
    await restartSystem(systemInstanceId);
    return { action: "restart_worker", attempted: true, fixed: true, detail: `Restarted worker for system ${systemInstanceId}` };
  } catch (err) {
    const detail = err instanceof DeploymentError ? err.message : String(err);
    return { action: "restart_worker", attempted: true, fixed: false, detail: `Restart failed for system ${systemInstanceId}: ${detail}` };
  }
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
  const { businessId, ownerId, canAutoFix } = await resolvePermissions(systemInstanceId);

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
      if (ownerId == null) {
        // No valid owner to attach the approval to — don't create a
        // dangling/incorrect pending_approvals row (FK requires a real
        // userId). Log the escalation failure so it's still visible.
        await logMonitoringEvent({
          systemInstanceId,
          businessId,
          eventType: "escalated",
          action: "reconnect",
          status: "failed",
          message: `Could not escalate unfixable connector ${connector.connector} to Pending Approval — business ${businessId} has no resolvable owner`,
        });
      } else {
        const existingApproval = await db
          .select({ id: pendingApprovalsTable.id })
          .from(pendingApprovalsTable)
          .where(
            and(
              eq(pendingApprovalsTable.businessId, businessId),
              eq(pendingApprovalsTable.status, "pending"),
              eq(pendingApprovalsTable.category, "autoFixHighRisk"),
              sql`${pendingApprovalsTable.payload}->>'systemInstanceId' = ${String(systemInstanceId)}`,
              sql`${pendingApprovalsTable.payload}->>'connectorId' = ${connector.connector}`,
            ),
          )
          .limit(1);

        if (existingApproval.length > 0) {
          await logMonitoringEvent({
            systemInstanceId,
            businessId,
            eventType: "escalated",
            action: "reconnect",
            status: "skipped",
            message: `Connector ${connector.connector} already has a pending approval — skipping duplicate escalation`,
          });
        } else {
          const research = await runRootCauseResearch({
            systemInstanceId,
            businessId,
            component: `connector:${connector.connector}`,
            errorMessage: result.detail,
            context: "A whitelisted auto-reconnect attempt already failed for this connector.",
          });
          await createPendingApproval({
            businessId,
            userId: ownerId,
            category: "autoFixHighRisk",
            riskLevel: "high",
            title: `Reconnect ${connector.connector} manually`,
            description: `${research.explanationForUser}\n\nDiagnosis: ${research.diagnosis}\nProposed fix: ${research.proposedFix}`,
            payload: { systemInstanceId, connectorId: connector.connector, research },
          });
          await logMonitoringEvent({
            systemInstanceId,
            businessId,
            eventType: "escalated",
            action: "reconnect",
            status: "escalated",
            message: `Escalated unfixable connector ${connector.connector} to Pending Approval (research confidence ${research.confidence}%)`,
          });
        }
      }
    }
  }

  const failedJobs = await db
    .select()
    .from(runtimeJobsTable)
    .where(and(eq(runtimeJobsTable.systemInstanceId, systemInstanceId), eq(runtimeJobsTable.status, "failed")));

  for (const job of failedJobs) {
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

    if (job.selfHealRetryCount >= 1) {
      // Already requeued once by self-heal and failed again — stop retrying
      // and escalate instead of looping forever.
      await logMonitoringEvent({
        systemInstanceId,
        businessId,
        eventType: "self_heal",
        action: "retry_job",
        status: "skipped",
        message: `Job ${job.jobId} (${job.jobType}) failed again after a self-heal retry — not retrying further`,
        metadata: { jobId: job.jobId, jobType: job.jobType },
      });

      if (businessId && ownerId != null) {
        const existingApproval = await db
          .select({ id: pendingApprovalsTable.id })
          .from(pendingApprovalsTable)
          .where(
            and(
              eq(pendingApprovalsTable.businessId, businessId),
              eq(pendingApprovalsTable.status, "pending"),
              eq(pendingApprovalsTable.category, "autoFixHighRisk"),
              sql`${pendingApprovalsTable.payload}->>'jobId' = ${job.jobId}`,
            ),
          )
          .limit(1);

        if (existingApproval.length === 0) {
          const research = await runRootCauseResearch({
            systemInstanceId,
            businessId,
            component: `runtime_job:${job.jobType}`,
            errorMessage: job.error ?? "(no error message recorded)",
            context: `Job ${job.jobId} was already retried once by self-heal and failed again.`,
          });
          await createPendingApproval({
            businessId,
            userId: ownerId,
            category: "autoFixHighRisk",
            riskLevel: "high",
            title: `Investigate repeatedly failing job (${job.jobType})`,
            description: `${research.explanationForUser}\n\nDiagnosis: ${research.diagnosis}\nProposed fix: ${research.proposedFix}`,
            payload: { systemInstanceId, jobId: job.jobId, jobType: job.jobType, research },
          });
          await logMonitoringEvent({
            systemInstanceId,
            businessId,
            eventType: "escalated",
            action: "retry_job",
            status: "escalated",
            message: `Escalated repeatedly failing job ${job.jobId} to Pending Approval (research confidence ${research.confidence}%)`,
          });
        }
      }
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

  const [instance] = await db
    .select({ buildStatus: systemInstancesTable.buildStatus })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));

  if (instance?.buildStatus === "failed") {
    if (!canAutoFix) {
      await logMonitoringEvent({
        systemInstanceId,
        businessId,
        eventType: "health_check",
        action: "restart_worker",
        status: "skipped",
        message: `System ${systemInstanceId}'s worker crashed but auto-fix is not enabled`,
      });
    } else {
      const cooldownStart = new Date(Date.now() - RESTART_WORKER_COOLDOWN_MS);
      const recentRestart = await db
        .select({ id: monitoringLogEventsTable.id })
        .from(monitoringLogEventsTable)
        .where(
          and(
            eq(monitoringLogEventsTable.systemInstanceId, systemInstanceId),
            eq(monitoringLogEventsTable.eventType, "self_heal"),
            eq(monitoringLogEventsTable.action, "restart_worker"),
            gt(monitoringLogEventsTable.createdAt, cooldownStart),
          ),
        )
        .limit(1);

      if (recentRestart.length > 0) {
        // Already tried a restart recently and it's still failed — stop
        // looping and escalate instead of restarting every tick.
        await logMonitoringEvent({
          systemInstanceId,
          businessId,
          eventType: "self_heal",
          action: "restart_worker",
          status: "skipped",
          message: `System ${systemInstanceId} crashed again after a recent self-heal restart — not retrying further`,
        });

        if (businessId && ownerId != null) {
          const existingApproval = await db
            .select({ id: pendingApprovalsTable.id })
            .from(pendingApprovalsTable)
            .where(
              and(
                eq(pendingApprovalsTable.businessId, businessId),
                eq(pendingApprovalsTable.status, "pending"),
                eq(pendingApprovalsTable.category, "autoFixHighRisk"),
                sql`${pendingApprovalsTable.payload}->>'systemInstanceId' = ${String(systemInstanceId)}`,
                sql`${pendingApprovalsTable.payload}->>'action' = 'restart_worker'`,
              ),
            )
            .limit(1);

          if (existingApproval.length === 0) {
            const research = await runRootCauseResearch({
              systemInstanceId,
              businessId,
              component: "worker",
              errorMessage: `System ${systemInstanceId}'s worker keeps crashing (buildStatus stuck at 'failed')`,
              context: "An automatic restart already ran recently and the worker crashed again.",
            });
            await createPendingApproval({
              businessId,
              userId: ownerId,
              category: "autoFixHighRisk",
              riskLevel: "high",
              title: `Investigate crashed worker (system ${systemInstanceId})`,
              description: `${research.explanationForUser}\n\nDiagnosis: ${research.diagnosis}\nProposed fix: ${research.proposedFix}`,
              payload: { systemInstanceId, action: "restart_worker", research },
            });
            await logMonitoringEvent({
              systemInstanceId,
              businessId,
              eventType: "escalated",
              action: "restart_worker",
              status: "escalated",
              message: `Escalated repeatedly crashing worker for system ${systemInstanceId} to Pending Approval (research confidence ${research.confidence}%)`,
            });
          }
        }
      } else {
        const result = await restartWorker(systemInstanceId);
        if (result.attempted) results.push(result);
        await logMonitoringEvent({
          systemInstanceId,
          businessId,
          eventType: "self_heal",
          action: result.action,
          status: result.fixed ? "success" : "failed",
          message: result.detail,
        });
      }
    }
  }

  if (results.length > 0) {
    logger.info({ systemInstanceId, results }, "Self-healing pass completed");
  }

  return results;
}

export { STUCK_JOB_THRESHOLD_MS };
