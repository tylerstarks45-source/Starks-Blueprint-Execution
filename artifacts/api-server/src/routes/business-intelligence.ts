import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  businessesTable,
  businessDnaClaimsTable,
  businessDnaConflictsTable,
  businessReviewQueueTable,
  businessTimelineEventsTable,
} from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import {
  applyUserConfirmedDnaValue,
  assembleBusinessContextPackage,
  assembleCrossBusinessSummary,
  computeRecommendedAction,
  getBusinessCapabilities,
  getBusinessState,
  initializeBusinessDna,
  reconcileDnaEvidence,
  publishBusinessEvent,
} from "../lib/business-intelligence";
import { z } from "zod/v4";

const router: IRouter = Router();

async function findOwnedBusiness(businessId: number, userId: number) {
  const [business] = await db.select().from(businessesTable).where(and(eq(businessesTable.id, businessId), eq(businessesTable.ownerId, userId)));
  return business ?? null;
}

function businessIdFrom(req: { params: Record<string, string | undefined> }): number | null {
  const id = Number(req.params.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

router.get("/businesses/:id/intelligence", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  if (!businessId || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const context = await assembleBusinessContextPackage({ businessId, userId: caller.id });
  // assembleBusinessContextPackage re-derives ownership internally and can
  // also return null if state/capability assembly fails; either way this
  // must be a proper 404, not a 200 with a null body, to stay consistent
  // with every sibling BI route above.
  if (!context) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serialize(context));
});

router.get("/businesses/:id/dna", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  if (!businessId || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await initializeBusinessDna(businessId);
  const claims = await db.select().from(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, businessId)).orderBy(businessDnaClaimsTable.fieldKey);
  res.json(serialize({ claims }));
});

const evidenceSchema = z.object({
  fieldKey: z.string().trim().min(1).max(100),
  value: z.unknown(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  source: z.string().trim().min(1).max(100).optional(),
  reasoning: z.string().trim().max(1000).optional(),
});

// User-authored edits are always User Confirmed, the only route permitted to
// change a user-confirmed value. System/inference evidence must use the
// internal service so it can never accidentally overwrite the owner.
router.put("/businesses/:id/dna/:fieldKey", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  const body = evidenceSchema.safeParse({ ...req.body, fieldKey: req.params.fieldKey });
  if (!businessId || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const result = await applyUserConfirmedDnaValue(businessId, {
    fieldKey: body.data.fieldKey,
    value: body.data.value,
    confidenceScore: body.data.confidenceScore ?? 100,
    trustLevel: "user_confirmed",
    source: body.data.source ?? "user_edit",
    reasoning: body.data.reasoning ?? "Confirmed or edited directly by the business owner.",
    observedAt: new Date(),
  });
  res.json(serialize(result));
});

router.get("/businesses/:id/state", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  const state = businessId ? await getBusinessState(businessId, caller.id) : null;
  if (!state) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serialize(state));
});

router.get("/businesses/:id/capabilities", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  const capabilities = businessId ? await getBusinessCapabilities(businessId, caller.id) : null;
  if (!capabilities) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serialize({ capabilities }));
});

router.get("/businesses/:id/timeline", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  if (!businessId || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const events = await db.select().from(businessTimelineEventsTable).where(eq(businessTimelineEventsTable.businessId, businessId)).orderBy(desc(businessTimelineEventsTable.occurredAt)).limit(100);
  res.json(serialize({ events }));
});

router.get("/businesses/:id/review-queue", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  if (!businessId || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const items = await db.select().from(businessReviewQueueTable).where(and(eq(businessReviewQueueTable.businessId, businessId), eq(businessReviewQueueTable.status, "open"))).orderBy(desc(businessReviewQueueTable.priority));
  res.json(serialize({ items }));
});

router.post("/businesses/:id/review-queue/:reviewId/resolve", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  const reviewId = Number(req.params.reviewId);
  const body = z.object({ status: z.enum(["resolved", "dismissed"]) }).safeParse(req.body);
  if (!businessId || !Number.isSafeInteger(reviewId) || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [item] = await db.update(businessReviewQueueTable).set({ status: body.data.status }).where(and(
    eq(businessReviewQueueTable.id, reviewId),
    eq(businessReviewQueueTable.businessId, businessId),
    eq(businessReviewQueueTable.status, "open"),
  )).returning();
  if (!item) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }
  await publishBusinessEvent({
    businessId,
    eventType: "review.user_decision",
    source: "business_intelligence",
    payload: { description: `Business owner ${body.data.status} a review item.`, relatedObjects: { reviewId: item.id } },
    dedupeKey: `review.user_decision:${item.id}:${body.data.status}`,
  });
  res.json(serialize(item));
});

router.get("/businesses/:id/conflicts", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  if (!businessId || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const conflicts = await db.select().from(businessDnaConflictsTable).where(and(eq(businessDnaConflictsTable.businessId, businessId), eq(businessDnaConflictsTable.status, "open"))).orderBy(desc(businessDnaConflictsTable.impactScore));
  const withRecommendations = conflicts.map((conflict) => ({ ...conflict, recommendedAction: computeRecommendedAction(conflict) }));
  res.json(serialize({ conflicts: withRecommendations }));
});

// Cross-Business Analysis (Business Context Isolation): explicit, opt-in
// endpoint only — a user must actively request this. Never surfaced or
// aggregated implicitly by any per-business route above.
router.get("/businesses/cross-business-summary", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const summary = await assembleCrossBusinessSummary(caller.id);
  res.json(serialize(summary));
});

const decisionSchema = z.object({ action: z.enum(["keep_current", "accept_new", "edit_value", "defer"]), value: z.unknown().optional() });

router.post("/businesses/:id/conflicts/:conflictId/decision", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const businessId = businessIdFrom(req);
  const conflictId = Number(req.params.conflictId);
  const body = decisionSchema.safeParse(req.body);
  if (!businessId || !Number.isSafeInteger(conflictId) || !(await findOwnedBusiness(businessId, caller.id))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [conflict] = await db.select().from(businessDnaConflictsTable).where(and(eq(businessDnaConflictsTable.id, conflictId), eq(businessDnaConflictsTable.businessId, businessId), eq(businessDnaConflictsTable.status, "open")));
  if (!conflict) {
    res.status(404).json({ error: "Conflict not found" });
    return;
  }

  if (body.data.action === "accept_new" || body.data.action === "edit_value") {
    await applyUserConfirmedDnaValue(businessId, {
      fieldKey: conflict.fieldKey,
      value: body.data.action === "edit_value" ? body.data.value : conflict.incomingValue,
      confidenceScore: 100,
      trustLevel: "user_confirmed",
      source: "user_conflict_decision",
      reasoning: `User chose to ${body.data.action === "accept_new" ? "accept the newly discovered value" : "edit the value"} during conflict resolution.`,
    });
  }
  const status = body.data.action === "defer" ? "deferred" : "resolved";
  const [updated] = await db.update(businessDnaConflictsTable).set({
    status,
    resolution: body.data.action,
    resolvedByUserId: caller.id,
    resolvedAt: new Date(),
  }).where(eq(businessDnaConflictsTable.id, conflict.id)).returning();
  await publishBusinessEvent({
    businessId,
    eventType: "conflict.user_decision",
    source: "business_intelligence",
    payload: { description: `User chose "${body.data.action}" for the ${conflict.fieldKey} conflict.`, relatedObjects: { conflictId: conflict.id, fieldKey: conflict.fieldKey } },
    dedupeKey: `conflict.user_decision:${conflict.id}:${body.data.action}`,
  });
  res.json(serialize(updated));
});

export default router;