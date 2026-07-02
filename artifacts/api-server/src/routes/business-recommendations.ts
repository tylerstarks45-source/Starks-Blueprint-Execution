import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, desc } from "drizzle-orm";
import { db, businessesTable, businessRecommendationsTable } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { enqueue } from "../lib/runtime/jobs";
import {
  GetBusinessRecommendationsParams,
  GetBusinessRecommendationsQueryParams,
  GenerateBusinessRecommendationsParams,
  DismissBusinessRecommendationParams,
  ApplyBusinessRecommendationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function findOwnedBusiness(businessId: number, ownerId: number) {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.ownerId, ownerId)));
  return business ?? null;
}

// ─── GET /api/businesses/:id/recommendations ─────────────────────────────────

router.get("/businesses/:id/recommendations", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessRecommendationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = GetBusinessRecommendationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const conditions = [eq(businessRecommendationsTable.businessId, business.id)];
  if (query.data.status) conditions.push(eq(businessRecommendationsTable.status, query.data.status));

  const recommendations = await db
    .select()
    .from(businessRecommendationsTable)
    .where(and(...conditions))
    .orderBy(desc(businessRecommendationsTable.confidence), desc(businessRecommendationsTable.createdAt));

  res.json(serialize({ recommendations }));
});

// ─── POST /api/businesses/:id/recommendations/generate ──────────────────────

router.post("/businesses/:id/recommendations/generate", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GenerateBusinessRecommendationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const jobId = await enqueue(
    "business_improvement_pass",
    { businessId: business.id, userId: caller.id },
    { priority: 5 },
  );

  res.status(202).json({ jobId, status: "queued" });
});

// ─── POST /api/businesses/:id/recommendations/:recId/dismiss ────────────────

router.post("/businesses/:id/recommendations/:recId/dismiss", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = DismissBusinessRecommendationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [row] = await db
    .update(businessRecommendationsTable)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(
      and(
        eq(businessRecommendationsTable.id, params.data.recId),
        eq(businessRecommendationsTable.businessId, business.id),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(serialize(row));
});

// ─── POST /api/businesses/:id/recommendations/:recId/apply ──────────────────

router.post("/businesses/:id/recommendations/:recId/apply", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = ApplyBusinessRecommendationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [row] = await db
    .update(businessRecommendationsTable)
    .set({ status: "applied", resolvedAt: new Date() })
    .where(
      and(
        eq(businessRecommendationsTable.id, params.data.recId),
        eq(businessRecommendationsTable.businessId, business.id),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(serialize(row));
});

export default router;
