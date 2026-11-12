import { db, pendingApprovalsTable, type ApprovalCategory, type ApprovalRiskLevel } from "@workspace/db";
import { notifyUser } from "./notify";

// Shared entry point for queuing an ASH Operations Mode approval. Any runtime
// producer that proposes a higher-risk action for a business under Operations
// Mode should call this instead of inserting into `pendingApprovalsTable`
// directly, so the owner is always notified with a one-click link to the
// business's approvals queue. Approved actions are carried out by
// executeApprovedAction() in lib/approval-executor.ts.
export async function createPendingApproval(input: {
  businessId: number | null;
  userId: number;
  category: ApprovalCategory;
  riskLevel: ApprovalRiskLevel;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
}) {
  const [approval] = await db
    .insert(pendingApprovalsTable)
    .values({
      businessId: input.businessId,
      userId: input.userId,
      category: input.category,
      riskLevel: input.riskLevel,
      title: input.title,
      description: input.description,
      payload: input.payload ?? {},
    })
    .returning();

  await notifyUser({
    userId: input.userId,
    title: "ASH needs your approval",
    message: input.title,
    notificationType: "approval_pending",
    linkUrl: input.businessId != null && input.category !== "ashAction" ? `/business/${input.businessId}` : "/approvals",
  });

  return approval;
}
