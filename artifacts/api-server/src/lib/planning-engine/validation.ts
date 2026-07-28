import { db, ashTasksTable, businessesTable, userCredentialsTable, pendingApprovalsTable, ashProjectMemoryTable, usersTable, type AshTask } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";
import { createPendingApproval } from "../approvals";
import { hasOperationsModeAccess } from "../operations-gate";
import type { ValidationIssue, ValidationResult } from "./types";

// ─── Plan Validation (Phase 1.3) ───────────────────────────────────────────
// "Before execution, verify required APIs, credentials, files, user
// approvals, integrations. If something is missing: mark the task blocked,
// explain why, continue with any tasks that are not blocked." Runs once per
// newly-planned task; re-run is not needed unless the task's description
// changes, since validation failures are unblocked explicitly (credential
// connected → re-check on next turn's readiness pass) or via dependency
// completion (dependency-manager.ts).

// Keyword → required credential key, reusing the same catalog keys the
// Connections Hub already uses (see connectors/catalog-map.ts) so "missing
// credential" checks stay in lockstep with what's actually connectable.
const CREDENTIAL_KEYWORDS: Array<[string, string[]]> = [
  ["TWITTER_BEARER_TOKEN", ["twitter", "post to x", "tweet"]],
  ["META_ACCESS_TOKEN", ["facebook", "instagram", "meta ads"]],
  ["TIKTOK_ACCESS_TOKEN", ["tiktok"]],
  ["LINKEDIN_ACCESS_TOKEN", ["linkedin"]],
  ["SHOPIFY_ACCESS_TOKEN", ["shopify", "storefront", "online store"]],
  ["SENDGRID_API_KEY", ["send an email", "email campaign", "email blast"]],
  ["MAILCHIMP_API_KEY", ["mailchimp"]],
  ["CONVERTKIT_API_KEY", ["convertkit"]],
  ["NOTION_API_KEY", ["notion"]],
  ["AIRTABLE_API_KEY", ["airtable"]],
  ["WORDPRESS_APP_PASSWORD", ["wordpress"]],
  ["SLACK_WEBHOOK_URL", ["post to slack", "slack notification"]],
  ["STRIPE_SECRET_KEY", ["charge a card", "process payment", "stripe checkout"]],
  ["GOOGLE_SHEETS_SERVICE_ACCOUNT", ["google sheet", "google sheets"]],
];

const APPROVAL_RISK_KEYWORDS = [
  "delete", "charge", "purchase", "spend money", "make a payment", "cancel subscription",
  "send to all customers", "publish permanently", "close the account",
];

const FILE_REFERENCE_KEYWORDS = ["the uploaded file", "the attached file", "the attached document", "the file i sent", "the file i uploaded"];

export async function validateTask(task: AshTask, userId: number, systemInstanceId: number | null): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const lower = task.description.toLowerCase();

  // 1. Required credentials / integrations (treated together — every
  // integration in this platform is backed by a credential).
  const neededKeys = CREDENTIAL_KEYWORDS.filter(([, kws]) => kws.some((kw) => lower.includes(kw))).map(([key]) => key);
  if (neededKeys.length > 0) {
    const rows = await db.select({ credentialKey: userCredentialsTable.credentialKey, status: userCredentialsTable.status })
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, userId));
    const connected = new Set(rows.filter((r) => r.status === "connected").map((r) => r.credentialKey));
    for (const key of neededKeys) {
      if (!connected.has(key)) {
        issues.push({ kind: "missing_credential", reason: `Requires a connected ${key} credential (Connections Hub).` });
      }
    }
  }

  // 2. Required files — task references an attachment we have no record of.
  if (FILE_REFERENCE_KEYWORDS.some((kw) => lower.includes(kw))) {
    const fileRefs = await db.select({ id: ashProjectMemoryTable.id })
      .from(ashProjectMemoryTable)
      .where(and(eq(ashProjectMemoryTable.projectId, task.projectId), eq(ashProjectMemoryTable.type, "file_ref")));
    if (fileRefs.length === 0) {
      issues.push({ kind: "missing_file", reason: "References an uploaded file, but no file is on record for this project yet." });
    }
  }

  // 3. Required user approval — higher-risk actions need a human in the loop
  // before an autonomous task executes, mirroring the existing Operations
  // Mode approval flow. Only applies when the project is linked to a
  // business (approvals are business-scoped); otherwise this check is
  // skipped rather than blocking every risky-sounding task with no business
  // to attach the approval to.
  const isRisky = APPROVAL_RISK_KEYWORDS.some((kw) => lower.includes(kw));
  if (isRisky && systemInstanceId != null) {
    try {
      const [business] = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.systemInstanceId, systemInstanceId));
      if (business) {
        const [owner] = await db.select({ membershipTier: usersTable.membershipTier, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
        const opsAccess = hasOperationsModeAccess(owner?.membershipTier, owner?.role);
        if (opsAccess) {
          const [existingApproval] = await db.select().from(pendingApprovalsTable).where(
            and(eq(pendingApprovalsTable.businessId, business.id), eq(pendingApprovalsTable.status, "approved")),
          );
          const alreadyApprovedForThisTask = existingApproval && (existingApproval.payload as any)?.taskId === task.id;
          if (!alreadyApprovedForThisTask) {
            const [pending] = await db.select().from(pendingApprovalsTable).where(
              and(eq(pendingApprovalsTable.businessId, business.id), eq(pendingApprovalsTable.status, "pending")),
            );
            const alreadyPendingForThisTask = pending && (pending.payload as any)?.taskId === task.id;
            if (!alreadyPendingForThisTask) {
              await createPendingApproval({
                businessId: business.id,
                userId,
                category: "autoFixHighRisk",
                riskLevel: "high",
                title: `Approval needed: ${task.description.slice(0, 100)}`,
                description: task.description,
                payload: { taskId: task.id, projectId: task.projectId },
              });
            }
            issues.push({ kind: "missing_approval", reason: "This action needs your explicit approval before ASH will execute it — check Pending Approvals." });
          }
        }
      }
    } catch (err) {
      logger.warn({ err, taskId: task.id }, "Planning Engine: approval check failed, treating task as unblocked");
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Validates every "pending" task among `newTasks` and persists status=blocked
 * + blockedReason for any that fail. Also re-checks every task in the
 * project that is CURRENTLY `blocked` for a resource reason (credential/
 * file/approval) — if the user has since connected the credential, uploaded
 * the file, or approved the action, the task is flipped back to `pending` so
 * it re-enters the ready/waiting pool. This is the resource-availability
 * counterpart to dependency-manager.ts's unlockDependentTasks(). Never
 * throws — a validation bug should never stop unrelated tasks from running.
 */
export async function validateProjectTasks(params: {
  projectId: number;
  newTasks: AshTask[];
  userId: number;
  systemInstanceId: number | null;
}): Promise<AshTask[]> {
  const { projectId, newTasks, userId, systemInstanceId } = params;
  const newTaskIds = new Set(newTasks.map((t) => t.id));

  const previouslyBlocked = await db
    .select()
    .from(ashTasksTable)
    .where(and(eq(ashTasksTable.projectId, projectId), eq(ashTasksTable.status, "blocked")));

  const toCheck = [...newTasks.filter((t) => t.status === "pending"), ...previouslyBlocked.filter((t) => !newTaskIds.has(t.id))];
  const updated: AshTask[] = [];

  for (const task of toCheck) {
    try {
      const result = await validateTask(task, userId, systemInstanceId);
      if (result.ok) {
        if (task.status === "blocked") {
          const [row] = await db.update(ashTasksTable).set({ status: "pending", blockedReason: null }).where(eq(ashTasksTable.id, task.id)).returning();
          logger.info({ taskId: task.id }, "Planning Engine: previously-blocked task revalidated and unblocked");
          updated.push(row);
        } else {
          updated.push(task);
        }
        continue;
      }
      const reason = result.issues.map((i) => i.reason).join(" ");
      const [row] = await db.update(ashTasksTable).set({ status: "blocked", blockedReason: reason }).where(eq(ashTasksTable.id, task.id)).returning();
      updated.push(row);
    } catch (err) {
      logger.warn({ err, taskId: task.id }, "Planning Engine: task validation failed, leaving task as-is");
      updated.push(task);
    }
  }

  return updated;
}
