import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, desc, and } from "drizzle-orm";
import { db, businessesTable, businessHealthScoresTable, runtimeJobsTable } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { enqueue } from "../lib/runtime/jobs";
import {
  GetBusinessHealthParams,
  GetBusinessHealthResponse,
  AnalyzeBusinessHealthParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const HISTORY_LIMIT = 10;

async function findOwnedBusiness(businessId: number, ownerId: number) {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.ownerId, ownerId)));
  return business ?? null;
}

async function isAnalyzing(businessId: number): Promise<boolean> {
  // Payload isn't indexed, so filter in JS over a small recent window of jobs.
  const recent = await db
    .select()
    .from(runtimeJobsTable)
    .where(eq(runtimeJobsTable.jobType, "business_health_analysis"))
    .orderBy(desc(runtimeJobsTable.queuedAt))
    .limit(50);
  return recent.some(
    (j) =>
      (j.status === "queued" || j.status === "active" || j.status === "retrying") &&
      (j.payload as { businessId?: number } | null)?.businessId === businessId,
  );
}

// ─── GET /api/businesses/:id/health ──────────────────────────────────────────

router.get("/businesses/:id/health", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = GetBusinessHealthParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await findOwnedBusiness(params.data.id, caller.id);
  if (!business) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const history = await db
    .select()
    .from(businessHealthScoresTable)
    .where(eq(businessHealthScoresTable.businessId, business.id))
    .orderBy(desc(businessHealthScoresTable.createdAt))
    .limit(HISTORY_LIMIT);

  const analyzing = await isAnalyzing(business.id);

  res.json(
    GetBusinessHealthResponse.parse(
      serialize({ latest: history[0] ?? null, history, analyzing }),
    ),
  );
});

// ─── POST /api/businesses/:id/health/analyze ─────────────────────────────────

router.post("/businesses/:id/health/analyze", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = AnalyzeBusinessHealthParams.safeParse(req.params);
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
    "business_health_analysis",
    { businessId: business.id, userId: caller.id },
    { priority: 5 },
  );

  res.status(202).json({ jobId, status: "queued" });
});

export default router;
