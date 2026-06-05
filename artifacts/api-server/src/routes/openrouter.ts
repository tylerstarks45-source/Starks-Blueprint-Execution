import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { desc, eq, sql } from "drizzle-orm";
import { db, openrouterUsageTable } from "@workspace/db";
import { complete } from "../lib/openrouter";
import { requireAuthActive } from "../lib/auth";
import {
  OpenrouterCompleteBody,
  ListOpenrouterUsageResponse,
  GetOpenrouterUsageSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/openrouter/complete", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = OpenrouterCompleteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    // Authoritative user id from the JWT — never trust a client-supplied userId for billing.
    const result = await complete({ ...parsed.data, userId });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenRouter request failed";
    if ((err as { code?: string })?.code === "out_of_credits") {
      res.status(402).json({ error: message, code: "out_of_credits" });
      return;
    }
    res.status(400).json({ error: message });
  }
});

// Returns only the authenticated user's own usage rows — never platform-wide data.
router.get("/openrouter/usage", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const rows = await db
    .select()
    .from(openrouterUsageTable)
    .where(eq(openrouterUsageTable.userId, userId))
    .orderBy(desc(openrouterUsageTable.createdAt))
    .limit(200);
  res.json(ListOpenrouterUsageResponse.parse(serialize(rows)));
});

// Returns aggregated stats scoped to the authenticated user only.
// Platform-wide aggregates are available via GET /api/ai/openrouter/usage (admin-only).
router.get("/openrouter/usage/summary", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const [summary] = await db
    .select({
      totalRequests: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
      successfulRequests: sql<number>`count(*) filter (where ${openrouterUsageTable.success} = 'true')::int`,
      failedRequests: sql<number>`count(*) filter (where ${openrouterUsageTable.success} = 'false')::int`,
      totalEstimatedCost: sql<string>`coalesce(sum(${openrouterUsageTable.estimatedCost}::numeric), 0)::text`,
    })
    .from(openrouterUsageTable)
    .where(eq(openrouterUsageTable.userId, userId));

  res.json(GetOpenrouterUsageSummaryResponse.parse(serialize(summary)));
});

export default router;
