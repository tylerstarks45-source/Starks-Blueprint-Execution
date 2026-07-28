import { db, businessesTable, usersTable, pendingApprovalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../logger";
import { createPendingApproval } from "../../../approvals";
import { hasOperationsModeAccess } from "../../../operations-gate";
import { detectRisks, highestRiskLevel } from "../risk-detector";
import type { ValidationContext, ValidationIssue, ValidationRule } from "../types";

// ─── User approval requirement rule ────────────────────────────────────────
// Risk detection itself now lives in risk-detector.ts's extensible category
// table; this rule just asks "is there any high-risk category present?" and,
// if so, mirrors the existing Operations Mode approval flow. Only applies
// when the project is linked to a business (approvals are business-scoped).
export const approvalRule: ValidationRule = {
  id: "approval_requirement",
  description: "Flags a high-risk task that needs explicit human approval before ASH executes it.",
  async evaluate(ctx: ValidationContext): Promise<ValidationIssue[]> {
    const risks = detectRisks(ctx.task.description);
    if (highestRiskLevel(risks) !== "high" || ctx.systemInstanceId == null) return [];

    try {
      const [business] = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.systemInstanceId, ctx.systemInstanceId));
      if (!business) return [];

      const [owner] = await db.select({ membershipTier: usersTable.membershipTier, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, ctx.userId));
      if (!hasOperationsModeAccess(owner?.membershipTier, owner?.role)) return [];

      const [existingApproval] = await db.select().from(pendingApprovalsTable).where(
        and(eq(pendingApprovalsTable.businessId, business.id), eq(pendingApprovalsTable.status, "approved")),
      );
      const alreadyApprovedForThisTask = existingApproval && (existingApproval.payload as any)?.taskId === ctx.task.id;
      if (alreadyApprovedForThisTask) return [];

      const [pending] = await db.select().from(pendingApprovalsTable).where(
        and(eq(pendingApprovalsTable.businessId, business.id), eq(pendingApprovalsTable.status, "pending")),
      );
      const alreadyPendingForThisTask = pending && (pending.payload as any)?.taskId === ctx.task.id;
      if (!alreadyPendingForThisTask) {
        await createPendingApproval({
          businessId: business.id,
          userId: ctx.userId,
          category: "autoFixHighRisk",
          riskLevel: "high",
          title: `Approval needed: ${ctx.task.description.slice(0, 100)}`,
          description: `${ctx.task.description}\n\nDetected risk(s): ${risks.map((r) => r.categoryId).join(", ")}`,
          payload: { taskId: ctx.task.id, projectId: ctx.task.projectId },
        });
      }

      const issue: ValidationIssue = {
        kind: "missing_approval",
        ruleId: "approval_requirement",
        reason: "This action needs your explicit approval before ASH will execute it — check Pending Approvals.",
      };
      return [issue];
    } catch (err) {
      logger.warn({ err, taskId: ctx.task.id }, "Validation Engine: approval rule failed, treating task as unblocked");
      return [];
    }
  },
};
