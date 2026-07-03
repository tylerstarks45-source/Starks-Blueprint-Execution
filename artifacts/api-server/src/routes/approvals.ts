import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc } from "drizzle-orm";
import { db, pendingApprovalsTable } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { executeApprovedAction, revertApprovedAction } from "../lib/approval-executor";
import { logger } from "../lib/logger";
import {
  ListApprovalsQueryParams,
  ListApprovalsResponse,
  ApprovePendingApprovalParams,
  ApprovePendingApprovalResponse,
  RejectPendingApprovalParams,
  RejectPendingApprovalResponse,
  RevertPendingApprovalParams,
  RevertPendingApprovalResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── GET /api/approvals ───────────────────────────────────────────────────────
// The caller's ASH Operations Mode approval queue (defaults to pending items
// across all of their businesses). Ownership is enforced via userId — ASH
// only ever creates rows scoped to the business owner.

router.get("/approvals", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const query = ListApprovalsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(pendingApprovalsTable.userId, caller.id)];
  if (query.data.status) conditions.push(eq(pendingApprovalsTable.status, query.data.status));
  if (query.data.businessId != null) conditions.push(eq(pendingApprovalsTable.businessId, query.data.businessId));

  const rows = await db
    .select()
    .from(pendingApprovalsTable)
    .where(and(...conditions))
    .orderBy(desc(pendingApprovalsTable.createdAt));

  res.json(ListApprovalsResponse.parse(serialize(rows)));
});

// ─── POST /api/approvals/:id/approve ─────────────────────────────────────────

router.post("/approvals/:id/approve", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = ApprovePendingApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(pendingApprovalsTable)
    .where(eq(pendingApprovalsTable.id, params.data.id));

  if (!existing || existing.userId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (existing.status !== "pending") {
    res.status(400).json({ error: `Approval already ${existing.status}` });
    return;
  }

  // Carry out the approved action now (e.g. promote the A/B winner), snapshot
  // the prior state into undoPayload so it can be reversed, and record when it
  // ran. Actions are logged to the system activity feed by the executor.
  let executedAt: Date | null = null;
  let undoPayload: Record<string, unknown> | null = null;
  try {
    const outcome = await executeApprovedAction(existing);
    if (outcome.executed) {
      executedAt = new Date();
      undoPayload = outcome.undoPayload ?? null;
    }
  } catch (err) {
    logger.error({ err, approvalId: existing.id }, "Failed to execute approved action");
    res.status(500).json({ error: "Failed to execute the approved action" });
    return;
  }

  const [row] = await db
    .update(pendingApprovalsTable)
    .set({ status: "approved", resolvedAt: new Date(), executedAt, undoPayload })
    .where(eq(pendingApprovalsTable.id, params.data.id))
    .returning();

  res.json(ApprovePendingApprovalResponse.parse(serialize(row)));
});

// ─── POST /api/approvals/:id/reject ──────────────────────────────────────────

router.post("/approvals/:id/reject", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = RejectPendingApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select({ userId: pendingApprovalsTable.userId })
    .from(pendingApprovalsTable)
    .where(eq(pendingApprovalsTable.id, params.data.id));

  if (!existing || existing.userId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [row] = await db
    .update(pendingApprovalsTable)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(eq(pendingApprovalsTable.id, params.data.id))
    .returning();

  res.json(RejectPendingApprovalResponse.parse(serialize(row)));
});

// ─── POST /api/approvals/:id/revert ──────────────────────────────────────────
// Undo a previously-approved, executed action (e.g. roll a landing page back to
// its pre-promotion HTML). Only works while the action is reversible and hasn't
// already been reverted.

router.post("/approvals/:id/revert", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = RevertPendingApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(pendingApprovalsTable)
    .where(eq(pendingApprovalsTable.id, params.data.id));

  if (!existing || existing.userId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (existing.status !== "approved" || !existing.executedAt) {
    res.status(400).json({ error: "Only an executed, approved action can be reverted." });
    return;
  }
  if (existing.revertedAt) {
    res.status(400).json({ error: "This action has already been reverted." });
    return;
  }

  let outcome;
  try {
    outcome = await revertApprovedAction(existing);
  } catch (err) {
    logger.error({ err, approvalId: existing.id }, "Failed to revert approved action");
    res.status(500).json({ error: "Failed to revert the action" });
    return;
  }

  if (!outcome.executed) {
    res.status(400).json({ error: outcome.detail });
    return;
  }

  const [row] = await db
    .update(pendingApprovalsTable)
    .set({ revertedAt: new Date() })
    .where(eq(pendingApprovalsTable.id, params.data.id))
    .returning();

  res.json(RevertPendingApprovalResponse.parse(serialize(row)));
});

export default router;
