import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, ilike, and, or, inArray, desc, sql } from "drizzle-orm";
import { db, blueprintsTable, blueprintStepsTable, blueprintReviewsTable, blueprintPurchasesTable, notificationsTable, usersTable, subscriptionsTable, creditTransactionsTable } from "@workspace/db";
import { getUncachableStripeClient } from "../lib/stripe";
import { requireAdmin, getActiveCallerPayload, requireAuth, isAdminRole, getTokenPayload } from "../lib/auth";
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
// Auth-aware listing: admins see all; users see admin/platform + approved community + own.
router.get("/blueprints", async (req, res): Promise<void> => {
  const conditions = [];

  // Server-side visibility gate — enforced regardless of client filters
  const caller = getTokenPayload(req); // soft — no 401 on missing token
  if (!isAdminRole(caller?.role ?? "")) {
    const visibilityFilter = caller
      ? or(
          inArray(blueprintsTable.source, ["admin", "platform"]),
          and(eq(blueprintsTable.source, "community"), eq(blueprintsTable.reviewStatus, "approved")),
          and(eq(blueprintsTable.source, "community"), eq(blueprintsTable.authorUserId, caller.id)),
        )
      : or(
          inArray(blueprintsTable.source, ["admin", "platform"]),
          and(eq(blueprintsTable.source, "community"), eq(blueprintsTable.reviewStatus, "approved")),
        );
    conditions.push(visibilityFilter);
  }

  if (req.query.status) conditions.push(eq(blueprintsTable.status, String(req.query.status)));
  if (req.query.categoryId) conditions.push(eq(blueprintsTable.categoryId, Number(req.query.categoryId)));
  if (req.query.slug) conditions.push(eq(blueprintsTable.slug, String(req.query.slug)));
  if (req.query.search) conditions.push(ilike(blueprintsTable.name, `%${req.query.search}%`));
  if (req.query.source) conditions.push(eq(blueprintsTable.source, String(req.query.source)));
  if (req.query.reviewStatus) conditions.push(eq(blueprintsTable.reviewStatus, String(req.query.reviewStatus)));

  const rows = await db
    .select()
    .from(blueprintsTable)
    .where(and(...conditions))
    .orderBy(blueprintsTable.name);

  // setupSteps is premium content — strip from list responses; detail/steps endpoint is gated separately
  const sanitized = rows.map((r) => ({ ...r, setupSteps: null }));
  res.json(ListBlueprintsResponse.parse(serialize(sanitized)));
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
// Builder tier+ community members may submit blueprints for admin review.
router.post("/blueprints/submit", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  // Submission eligibility: Builder plan or higher (admins always allowed)
  if (!isAdminRole(caller.role)) {
    const [userRow] = await db
      .select({ membershipTier: usersTable.membershipTier })
      .from(usersTable)
      .where(eq(usersTable.id, caller.id));
    // Canonical tiers + legacy aliases — anything above the free tier can submit
    const SUBMIT_TIERS = new Set(["builder", "operator", "empire", "pro", "enterprise"]);
    if (!SUBMIT_TIERS.has(userRow?.membershipTier ?? "")) {
      res.status(403).json({
        error: "Blueprint submission requires a Builder plan or higher. Upgrade your plan to contribute to the marketplace.",
        code: "tier_required",
      });
      return;
    }
  }

  const parsed = SubmitBlueprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Price: 0 (free) or 5–99 credits
  const priceCredits = parsed.data.priceCredits ?? 0;
  if (priceCredits !== 0 && (priceCredits < 5 || priceCredits > 99)) {
    res.status(400).json({ error: "priceCredits must be 0 (free) or between 5 and 99" });
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
      estimatedEarnings: parsed.data.estimatedEarnings ?? null,
      requiredTools: parsed.data.requiredTools ?? null,
      setupSteps: parsed.data.setupSteps ?? null,
      priceCredits,
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

// ── GET /api/blueprints/:id/entitlement ─────────────────────────────────────
// Returns whether the caller can access paid content for this blueprint.
router.get("/blueprints/:id/entitlement", async (req, res): Promise<void> => {
  const params = GetBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bp] = await db
    .select({ priceCredits: blueprintsTable.priceCredits, authorUserId: blueprintsTable.authorUserId })
    .from(blueprintsTable)
    .where(eq(blueprintsTable.id, params.data.id));
  if (!bp) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }
  const isFree = (bp.priceCredits ?? 0) === 0;
  if (isFree) {
    res.json({ isFree: true, hasPurchased: false, canAccess: true });
    return;
  }
  const caller = getTokenPayload(req); // soft auth — no 401
  const isAdmin = isAdminRole(caller?.role ?? "");
  const isAuthor = bp.authorUserId != null && caller?.id === bp.authorUserId;
  if (isAdmin || isAuthor) {
    res.json({ isFree: false, hasPurchased: true, canAccess: true });
    return;
  }
  if (!caller) {
    res.json({ isFree: false, hasPurchased: false, canAccess: false });
    return;
  }
  const [purchase] = await db
    .select({ id: blueprintPurchasesTable.id })
    .from(blueprintPurchasesTable)
    .where(and(eq(blueprintPurchasesTable.blueprintId, params.data.id), eq(blueprintPurchasesTable.buyerUserId, caller.id)));
  res.json({ isFree: false, hasPurchased: !!purchase, canAccess: !!purchase });
});

// ── GET /api/blueprints/:id ─────────────────────────────────────────────────
// Visibility-gated: unapproved community blueprints only visible to author/admin.
// Paid content (setupSteps) stripped for unentitled callers.
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

  const caller = getTokenPayload(req); // soft auth — no 401
  const isAdmin = isAdminRole(caller?.role ?? "");
  const isAuthor = row.authorUserId != null && caller?.id === row.authorUserId;

  // Community blueprints that are not approved are only visible to the author and admins
  if (row.source === "community" && row.reviewStatus !== "approved" && !isAdmin && !isAuthor) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized: any = serialize(row);

  // Strip premium content unless caller is entitled (author, admin, or purchaser)
  if ((row.priceCredits ?? 0) > 0 && !isAdmin && !isAuthor) {
    const hasPurchased = caller
      ? !!(await db
          .select({ id: blueprintPurchasesTable.id })
          .from(blueprintPurchasesTable)
          .where(and(eq(blueprintPurchasesTable.blueprintId, row.id), eq(blueprintPurchasesTable.buyerUserId, caller.id)))
          .then((r) => r[0]))
      : false;
    if (!hasPurchased) {
      serialized.setupSteps = null;
    }
  }

  res.json(GetBlueprintResponse.parse(serialized));
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

  // Block self-purchase — authors cannot buy their own blueprint
  if (bp.authorUserId !== null && bp.authorUserId === caller.id) {
    res.status(403).json({ error: "You cannot purchase your own blueprint" });
    return;
  }

  const priceCredits = bp.priceCredits ?? 0;
  const creatorShare = Math.floor(priceCredits * 0.7);

  // Balance check before any writes
  if (priceCredits > 0) {
    const balance = await getBalance(caller.id);
    if (balance.total < priceCredits) {
      res.status(402).json({ error: "Insufficient credits" });
      return;
    }
  }

  // All purchase writes run inside a single DB transaction for financial consistency.
  // All credit writes use `tx` (not the global `db`) so they are truly atomic:
  // if any step fails the entire transaction rolls back — no partial credit state.
  let purchase: typeof blueprintPurchasesTable.$inferSelect | undefined;
  try {
    purchase = await db.transaction(async (tx) => {
      // Step 1 — idempotency guard: unique constraint (blueprintId, buyerUserId)
      // means concurrent duplicate requests fail here before money moves.
      const [rec] = await tx
        .insert(blueprintPurchasesTable)
        .values({
          blueprintId: params.data.id,
          buyerUserId: caller.id,
          authorUserId: bp.authorUserId ?? null,
          priceCredits,
          creatorShareCredits: creatorShare,
        })
        .onConflictDoNothing()
        .returning();

      if (!rec) return undefined; // already purchased — nothing to roll back

      if (priceCredits > 0) {
        // Step 2 — read balances inside the transaction for consistency
        const [balRow] = await tx
          .select({ monthly: usersTable.creditsBalance, wallet: usersTable.walletBalance })
          .from(usersTable)
          .where(eq(usersTable.id, caller.id));
        const walletBal  = balRow?.wallet  ?? 0;
        const monthlyBal = balRow?.monthly ?? 0;

        // Step 3 — debit buyer: wallet-first, then monthly credits
        let walletDeduct  = 0;
        let monthlyDeduct = 0;
        if (walletBal >= priceCredits) {
          walletDeduct = priceCredits;
        } else {
          walletDeduct  = walletBal;
          monthlyDeduct = priceCredits - walletBal;
        }
        const patch: Record<string, unknown> = {};
        if (walletDeduct  > 0) patch.walletBalance  = sql`${usersTable.walletBalance}  - ${walletDeduct}`;
        if (monthlyDeduct > 0) patch.creditsBalance = sql`${usersTable.creditsBalance} - ${monthlyDeduct}`;
        const [buyerAfter] = await tx
          .update(usersTable)
          .set(patch)
          .where(eq(usersTable.id, caller.id))
          .returning({ c: usersTable.creditsBalance, w: usersTable.walletBalance });
        await tx.insert(creditTransactionsTable).values({
          userId:       caller.id,
          amount:       -priceCredits,
          balanceAfter: (buyerAfter?.c ?? 0) + (buyerAfter?.w ?? 0),
          type:         "wallet_purchase",
          reason:       `Purchase blueprint "${bp.name}"`,
          model:        null,
          tokens:       null,
        });

        // Step 4 — credit creator 70% into their wallet
        if (bp.authorUserId && creatorShare > 0) {
          const [creatorAfter] = await tx
            .update(usersTable)
            .set({ walletBalance: sql`${usersTable.walletBalance} + ${creatorShare}` })
            .where(eq(usersTable.id, bp.authorUserId))
            .returning({ c: usersTable.creditsBalance, w: usersTable.walletBalance });
          await tx.insert(creditTransactionsTable).values({
            userId:       bp.authorUserId,
            amount:       creatorShare,
            balanceAfter: (creatorAfter?.c ?? 0) + (creatorAfter?.w ?? 0),
            type:         "wallet_purchase",
            reason:       `Blueprint sale: "${bp.name}"`,
            model:        null,
            tokens:       null,
          });
        }
      }

      // Step 5 — increment salesCount
      await tx
        .update(blueprintsTable)
        .set({ salesCount: (bp.salesCount ?? 0) + 1 })
        .where(eq(blueprintsTable.id, params.data.id));

      return rec;
    });
  } catch (txErr: any) {
    req.log.error({ txErr }, "Blueprint purchase transaction failed");
    res.status(500).json({ error: "Purchase failed — please try again" });
    return;
  }

  if (!purchase) {
    res.status(409).json({ error: "You have already purchased this blueprint" });
    return;
  }

  // Creator notification is fire-and-forget outside the transaction (non-fatal)
  if (priceCredits > 0 && bp.authorUserId) {
    db.insert(notificationsTable).values({
      userId: bp.authorUserId,
      title: "Blueprint Sold!",
      message: `Your blueprint "${bp.name}" was purchased. You earned ${creatorShare} credits.`,
      notificationType: "success",
      read: false,
    }).catch(() => {});
  }

  res.status(201).json(serialize(purchase));
});

// ── POST /api/blueprints/:id/checkout — Stripe one-time payment ──────────────
// Creates a Stripe Checkout Session (mode=payment) for direct card purchase.
// On success, the /api/stripe/webhook handler fulfils the purchase.
router.post("/blueprints/:id/checkout", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;

  const params = PurchaseBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bp] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, params.data.id));
  if (!bp) { res.status(404).json({ error: "Blueprint not found" }); return; }

  if (bp.reviewStatus !== "approved" && !isAdminRole(caller.role)) {
    res.status(403).json({ error: "Blueprint is not available for purchase" });
    return;
  }

  // Block author self-purchase
  if (bp.authorUserId !== null && bp.authorUserId === caller.id) {
    res.status(403).json({ error: "You cannot purchase your own blueprint" });
    return;
  }

  const priceCredits = bp.priceCredits ?? 0;
  if (priceCredits === 0) {
    res.status(400).json({ error: "This blueprint is free — use the standard access flow" });
    return;
  }

  // Check already purchased
  const [existing] = await db
    .select({ id: blueprintPurchasesTable.id })
    .from(blueprintPurchasesTable)
    .where(and(
      eq(blueprintPurchasesTable.blueprintId, params.data.id),
      eq(blueprintPurchasesTable.buyerUserId, caller.id),
    ));
  if (existing) {
    res.status(409).json({ error: "You have already purchased this blueprint" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, caller.id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Reuse existing Stripe customer id when available
    const [existingSub] = await db
      .select({ stripeCustomerId: subscriptionsTable.stripeCustomerId })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, caller.id));

    let customerId: string;
    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: { userId: String(caller.id) },
      });
      customerId = customer.id;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : "http://localhost:80";

    // 1 credit = $0.10 USD — minimum charge is $0.50 (5 credits), max $9.90 (99 credits)
    const amountCents = priceCredits * 10;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: bp.name,
            description: (bp.description ?? `AI Blueprint: ${bp.name}`).slice(0, 200),
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/blueprints/${bp.slug ?? params.data.id}?purchased=1`,
      cancel_url:  `${baseUrl}/blueprints/${bp.slug ?? params.data.id}?canceled=1`,
      metadata: {
        userId:      String(caller.id),
        blueprintId: String(params.data.id),
        kind:        "blueprint_purchase",
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    req.log.error({ err }, "Blueprint Stripe checkout error");
    res.status(500).json({ error: "Failed to create checkout session. Please try again." });
  }
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

  // Block self-reviews — authors cannot rate their own blueprint
  if (bp.authorUserId !== null && bp.authorUserId === caller.id) {
    res.status(403).json({ error: "You cannot review your own blueprint" });
    return;
  }

  // Blueprint must be publicly visible (approved or platform)
  const isApproved = bp.reviewStatus === "approved" || bp.source === "admin" || bp.source === "platform";
  if (!isApproved && !isAdminRole(caller.role)) {
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
// Public for free blueprints; paid blueprints require a purchase or authorship.
router.get("/blueprints/:id/steps", async (req, res): Promise<void> => {
  const params = GetBlueprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bp] = await db
    .select({ priceCredits: blueprintsTable.priceCredits, authorUserId: blueprintsTable.authorUserId })
    .from(blueprintsTable)
    .where(eq(blueprintsTable.id, params.data.id));
  if (!bp) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }

  if ((bp.priceCredits ?? 0) > 0) {
    const caller = await getActiveCallerPayload(req, res);
    if (!caller) return; // getActiveCallerPayload already sends 401
    if (!isAdminRole(caller.role) && bp.authorUserId !== caller.id) {
      const [purchased] = await db
        .select({ id: blueprintPurchasesTable.id })
        .from(blueprintPurchasesTable)
        .where(
          and(
            eq(blueprintPurchasesTable.blueprintId, params.data.id),
            eq(blueprintPurchasesTable.buyerUserId, caller.id),
          ),
        );
      if (!purchased) {
        res.status(403).json({ error: "Purchase required to access blueprint steps", code: "purchase_required" });
        return;
      }
    }
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
