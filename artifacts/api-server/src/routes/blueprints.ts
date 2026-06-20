import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, ilike, and, desc } from "drizzle-orm";
import { db, blueprintsTable, blueprintStepsTable, blueprintReviewsTable, blueprintPurchasesTable, notificationsTable, usersTable } from "@workspace/db";
import { requireAdmin, getActiveCallerPayload, requireAuth, isAdminRole } from "../lib/auth";
import { adjustCredits, adjustWalletCredits, getBalance } from "../lib/credits";
import {
  ListBlueprintsResponse,
  GetBlueprintResponse,
  UpdateBlueprintResponse,
  CreateBlueprintBody,
  UpdateBlueprintBody,
  GetBlueprintParams,
  UpdateBlueprintParams,
  DeleteBlueprintParams,
  ListBlueprintStepsResponse,
  UpdateBlueprintStepResponse,
  CreateBlueprintStepParams,
  CreateBlueprintStepBody,
  UpdateBlueprintStepBody,
  UpdateBlueprintStepParams,
  DeleteBlueprintStepParams,
  SubmitBlueprintBody,
  ListMyBlueprintsResponse,
  PurchaseBlueprintParams,
  ListBlueprintReviewsParams,
  ListBlueprintReviewsResponse,
  CreateBlueprintReviewParams,
  CreateBlueprintReviewBody,
  ListPendingBlueprintsResponse,
  ReviewBlueprintParams,
  ReviewBlueprintBody,
  ReviewBlueprintResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /api/blueprints ─────────────────────────────────────────────────────
// Public read — all authenticated and unauthenticated callers may list blueprints.
router.get("/blueprints", async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.status) conditions.push(eq(blueprintsTable.status, String(req.query.status)));
  if (req.query.categoryId) conditions.push(eq(blueprintsTable.categoryId, Number(req.query.categoryId)));
  if (req.query.slug) conditions.push(eq(blueprintsTable.slug, String(req.query.slug)));
  if (req.query.search) conditions.push(ilike(blueprintsTable.name, `%${req.query.search}%`));
  if (req.query.source) conditions.push(eq(blueprintsTable.source, String(req.query.source)));
  if (req.query.reviewStatus) conditions.push(eq(blueprintsTable.reviewStatus, String(req.query.reviewStatus)));

  const rows = conditions.length
    ? await db.select().from(blueprintsTable).where(and(...conditions)).orderBy(blueprintsTable.name)
    : await db.select().from(blueprintsTable).orderBy(blueprintsTable.name);

  res.json(ListBlueprintsResponse.parse(serialize(rows)));
});

// ── POST /api/blueprints — ADMIN ONLY ──────────────────────────────────────
router.post("/blueprints", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = CreateBlueprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(blueprintsTable).values(parsed.data).returning();
  res.status(201).json(GetBlueprintResponse.parse(serialize(row)));
});

// ── POST /api/blueprints/submit ─────────────────────────────────────────────
// Community members may submit blueprints for admin review.
router.post("/blueprints/submit", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const parsed = SubmitBlueprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Auto-generate unique slug from name
  const baseSlug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substring(2, 7);
  const slug = `${baseSlug}-${suffix}`;

  const [row] = await db
    .insert(blueprintsTable)
    .values({
      slug,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      categoryId: parsed.data.categoryId ?? null,
      difficulty: parsed.data.difficulty ?? "beginner",
      estimatedCost: parsed.data.estimatedCost ?? null,
      estimatedTime: parsed.data.estimatedTime ?? null,
      priceCredits: parsed.data.priceCredits ?? 0,
      source: "community",
      reviewStatus: "pending_review",
      status: "draft",
      version: "1.0.0",
      authorUserId: caller.id,
    })
    .returning();

  // Notify platform admins (insert a notification for each admin)
  try {
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "SUPER_ADMIN"));
    for (const admin of admins) {
      await db.insert(notificationsTable).values({
        userId: admin.id,
        title: "New Blueprint Submission",
        message: `"${parsed.data.name}" submitted by user #${caller.id} is pending review.`,
        notificationType: "info",
        read: false,
      });
    }
  } catch {
    // Notification failure is non-fatal
  }

  res.status(201).json(GetBlueprintResponse.parse(serialize(row)));
});

// ── GET /api/blueprints/my ──────────────────────────────────────────────────
// Returns the caller's own submitted blueprints.
// MUST be registered before GET /blueprints/:id to avoid "my" matching as an id.
router.get("/blueprints/my", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const rows = await db
    .select()
    .from(blueprintsTable)
    .where(eq(blueprintsTable.authorUserId, caller.id))
    .orderBy(desc(blueprintsTable.createdAt));

  res.json(ListMyBlueprintsResponse.parse(serialize(rows)));
});

// ── GET /api/blueprints/:id ─────────────────────────────────────────────────
// Public read.
router.get("/blueprints/:id", async (req, res): Promise<void> => {
  const params = GetBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }
  res.json(GetBlueprintResponse.parse(serialize(row)));
});

// ── PATCH /api/blueprints/:id — ADMIN ONLY ─────────────────────────────────
router.patch("/blueprints/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlueprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(blueprintsTable).set(parsed.data).where(eq(blueprintsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }
  res.json(UpdateBlueprintResponse.parse(serialize(row)));
});

// ── DELETE /api/blueprints/:id — ADMIN ONLY ────────────────────────────────
router.delete("/blueprints/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(blueprintsTable).where(eq(blueprintsTable.id, params.data.id));
  res.sendStatus(204);
});

// ── POST /api/blueprints/:id/purchase ──────────────────────────────────────
// Deducts priceCredits from buyer, gives 70% to creator.
router.post("/blueprints/:id/purchase", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = PurchaseBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bp] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, params.data.id));
  if (!bp) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }
  if (bp.reviewStatus !== "approved" && !isAdminRole(caller.role)) {
    res.status(403).json({ error: "Blueprint is not available for purchase" });
    return;
  }
  // Check if already purchased
  const [existing] = await db
    .select({ id: blueprintPurchasesTable.id })
    .from(blueprintPurchasesTable)
    .where(
      and(
        eq(blueprintPurchasesTable.blueprintId, params.data.id),
        eq(blueprintPurchasesTable.buyerUserId, caller.id),
      ),
    );
  if (existing) {
    res.status(409).json({ error: "You have already purchased this blueprint" });
    return;
  }

  const priceCredits = bp.priceCredits ?? 0;
  const creatorShare = Math.floor(priceCredits * 0.7);

  if (priceCredits > 0) {
    const balance = await getBalance(caller.id);
    if (balance.total < priceCredits) {
      res.status(402).json({ error: "Insufficient credits" });
      return;
    }
    // Deduct from wallet first, then monthly
    if (balance.wallet >= priceCredits) {
      await adjustWalletCredits(caller.id, -priceCredits, { reason: `Purchase blueprint "${bp.name}"` });
    } else if (balance.wallet > 0) {
      await adjustWalletCredits(caller.id, -balance.wallet, { reason: `Purchase blueprint "${bp.name}"` });
      await adjustCredits(caller.id, -(priceCredits - balance.wallet), "admin_adjust", { reason: `Purchase blueprint "${bp.name}"` });
    } else {
      await adjustCredits(caller.id, -priceCredits, "admin_adjust", { reason: `Purchase blueprint "${bp.name}"` });
    }
    // Pay creator 70%
    if (bp.authorUserId && creatorShare > 0) {
      await adjustWalletCredits(bp.authorUserId, creatorShare, { reason: `Blueprint sale: "${bp.name}"` });
      // Notify creator
      try {
        await db.insert(notificationsTable).values({
          userId: bp.authorUserId,
          title: "Blueprint Sold!",
          message: `Your blueprint "${bp.name}" was purchased. You earned ${creatorShare} credits.`,
          notificationType: "success",
          read: false,
        });
      } catch {
        // Non-fatal
      }
    }
  }

  // Increment salesCount
  await db
    .update(blueprintsTable)
    .set({ salesCount: (bp.salesCount ?? 0) + 1 })
    .where(eq(blueprintsTable.id, params.data.id));

  const [purchase] = await db
    .insert(blueprintPurchasesTable)
    .values({
      blueprintId: params.data.id,
      buyerUserId: caller.id,
      authorUserId: bp.authorUserId ?? null,
      priceCredits,
      creatorShareCredits: creatorShare,
    })
    .returning();

  res.status(201).json(serialize(purchase));
});

// ── GET /api/blueprints/:id/reviews ────────────────────────────────────────
router.get("/blueprints/:id/reviews", async (req, res): Promise<void> => {
  const params = ListBlueprintReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(blueprintReviewsTable)
    .where(eq(blueprintReviewsTable.blueprintId, params.data.id))
    .orderBy(desc(blueprintReviewsTable.createdAt));

  res.json(ListBlueprintReviewsResponse.parse(serialize(rows)));
});

// ── POST /api/blueprints/:id/reviews ────────────────────────────────────────
// Authenticated users who purchased (or free blueprints) may review once.
router.post("/blueprints/:id/reviews", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = CreateBlueprintReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateBlueprintReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.rating < 1 || parsed.data.rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  const [bp] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, params.data.id));
  if (!bp) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }

  // Paid blueprints: must have purchased
  if ((bp.priceCredits ?? 0) > 0) {
    const [purchased] = await db
      .select({ id: blueprintPurchasesTable.id })
      .from(blueprintPurchasesTable)
      .where(
        and(
          eq(blueprintPurchasesTable.blueprintId, params.data.id),
          eq(blueprintPurchasesTable.buyerUserId, caller.id),
        ),
      );
    if (!purchased && !isAdminRole(caller.role)) {
      res.status(403).json({ error: "You must purchase this blueprint before reviewing it" });
      return;
    }
  }

  // One review per user
  const [existing] = await db
    .select({ id: blueprintReviewsTable.id })
    .from(blueprintReviewsTable)
    .where(
      and(
        eq(blueprintReviewsTable.blueprintId, params.data.id),
        eq(blueprintReviewsTable.userId, caller.id),
      ),
    );
  if (existing) {
    res.status(409).json({ error: "You have already reviewed this blueprint" });
    return;
  }

  const [review] = await db
    .insert(blueprintReviewsTable)
    .values({
      blueprintId: params.data.id,
      userId: caller.id,
      rating: parsed.data.rating,
      reviewText: parsed.data.reviewText ?? null,
    })
    .returning();

  // Update ratingAvg and ratingCount on the blueprint
  const allReviews = await db
    .select({ rating: blueprintReviewsTable.rating })
    .from(blueprintReviewsTable)
    .where(eq(blueprintReviewsTable.blueprintId, params.data.id));

  const count = allReviews.length;
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / count;

  await db
    .update(blueprintsTable)
    .set({ ratingCount: count, ratingAvg: Math.round(avg * 10) / 10 })
    .where(eq(blueprintsTable.id, params.data.id));

  res.status(201).json(serialize(review));
});

// ── GET /api/blueprints/:id/steps ───────────────────────────────────────────
// Public read.
router.get("/blueprints/:id/steps", async (req, res): Promise<void> => {
  const params = GetBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db.select().from(blueprintStepsTable).where(eq(blueprintStepsTable.blueprintId, params.data.id)).orderBy(blueprintStepsTable.stepNumber);
  res.json(ListBlueprintStepsResponse.parse(serialize(rows)));
});

// ── POST /api/blueprints/:id/steps — ADMIN ONLY ────────────────────────────
router.post("/blueprints/:id/steps", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = CreateBlueprintStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateBlueprintStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(blueprintStepsTable).values({ ...parsed.data, blueprintId: params.data.id }).returning();
  res.status(201).json(UpdateBlueprintStepResponse.parse(serialize(row)));
});

// ── PATCH /api/blueprint-steps/:id — ADMIN ONLY ────────────────────────────
router.patch("/blueprint-steps/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateBlueprintStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlueprintStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(blueprintStepsTable).set(parsed.data).where(eq(blueprintStepsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Blueprint step not found" });
    return;
  }
  res.json(UpdateBlueprintStepResponse.parse(serialize(row)));
});

// ── DELETE /api/blueprint-steps/:id — ADMIN ONLY ───────────────────────────
router.delete("/blueprint-steps/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteBlueprintStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(blueprintStepsTable).where(eq(blueprintStepsTable.id, params.data.id));
  res.sendStatus(204);
});

// ── GET /api/admin/blueprints/pending — ADMIN ONLY ─────────────────────────
router.get("/admin/blueprints/pending", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const rows = await db
    .select()
    .from(blueprintsTable)
    .where(eq(blueprintsTable.reviewStatus, "pending_review"))
    .orderBy(blueprintsTable.createdAt);
  res.json(ListPendingBlueprintsResponse.parse(serialize(rows)));
});

// ── PATCH /api/admin/blueprints/:id/review-status — ADMIN ONLY ─────────────
router.patch("/admin/blueprints/:id/review-status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = ReviewBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ReviewBlueprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const validStatuses = ["approved", "rejected", "pending_review"];
  if (!validStatuses.includes(parsed.data.reviewStatus)) {
    res.status(400).json({ error: "reviewStatus must be one of: approved, rejected, pending_review" });
    return;
  }

  const updates: Record<string, unknown> = { reviewStatus: parsed.data.reviewStatus };
  if (parsed.data.reviewStatus === "approved") updates.status = "active";
  if (parsed.data.rejectionReason) updates.rejectionReason = parsed.data.rejectionReason;

  const [row] = await db
    .update(blueprintsTable)
    .set(updates)
    .where(eq(blueprintsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }

  // Notify the blueprint author
  if (row.authorUserId) {
    const isApproved = parsed.data.reviewStatus === "approved";
    try {
      await db.insert(notificationsTable).values({
        userId: row.authorUserId,
        title: isApproved ? "Blueprint Approved!" : "Blueprint Rejected",
        message: isApproved
          ? `Your blueprint "${row.name}" has been approved and is now live in the marketplace.`
          : `Your blueprint "${row.name}" was not approved. ${parsed.data.rejectionReason ?? ""}`,
        notificationType: isApproved ? "success" : "warning",
        read: false,
      });
    } catch {
      // Non-fatal
    }
  }

  res.json(ReviewBlueprintResponse.parse(serialize(row)));
});

export default router;
