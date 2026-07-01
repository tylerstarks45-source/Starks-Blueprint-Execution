import { db, pendingApprovalsTable, notificationsTable, type ApprovalCategory, type ApprovalRiskLevel } from "@workspace/db";

// Shared entry point for queuing an ASH Operations Mode approval. Any future
// runtime worker that proposes a higher-risk action for a business under
// Operations Mode should call this instead of inserting into
// `pendingApprovalsTable` directly, so the owner is always notified in the
// same transaction the approval row is created in. Actually executing the
// approved/rejected action is out of scope for this task.
export async function createPendingApproval(input: {
  businessId: number;
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

  await db.insert(notificationsTable).values({
    userId: input.userId,
    title: "ASH needs your approval",
    message: input.title,
    notificationType: "approval_pending",
  });

  return approval;
}
