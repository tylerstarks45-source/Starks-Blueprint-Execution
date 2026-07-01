import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc } from "drizzle-orm";
import { db, pendingApprovalsTable } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import {
  ListApprovalsQueryParams,
  ListApprovalsResponse,
  ApprovePendingApprovalParams,
  ApprovePendingApprovalResponse,
  RejectPendingApprovalParams,
  RejectPendingApprovalResponse,
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
    .select({ userId: pendingApprovalsTable.userId })
    .from(pendingApprovalsTable)
    .where(eq(pendingApprovalsTable.id, params.data.id));

  if (!existing || existing.userId !== caller.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Actually executing the approved action (monitoring/self-healing/content
  // publishing) is out of scope for this task — this endpoint only records
  // the approval decision. A future runtime worker will pick up "approved"
  // rows and execute their payload.
  const [row] = await db
    .update(pendingApprovalsTable)
    .set({ status: "approved", resolvedAt: new Date() })
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

export default router;
