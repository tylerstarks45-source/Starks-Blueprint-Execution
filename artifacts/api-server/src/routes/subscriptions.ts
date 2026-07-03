import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, sql } from "drizzle-orm";
import { db, subscriptionsTable, usersTable, processedStripeEventsTable, blueprintsTable, blueprintPurchasesTable, notificationsTable, referralEventsTable, referralCodesTable } from "@workspace/db";
import { z } from "zod";
import { getUncachableStripeClient } from "../lib/stripe";
import { adjustCredits, adjustWalletCredits, tierAllotment } from "../lib/credits";
import { requireAuthActive } from "../lib/auth";
import { notifyUser } from "../lib/notify";
import { hasOperationsModeAccess } from "../lib/operations-gate";

const router: IRouter = Router();

// Tier config — 3 paid tiers matching the Stripe product catalogue.
// Price IDs are loaded from env vars at runtime (set STRIPE_PRICE_BUILDER,
// STRIPE_PRICE_OPERATOR, STRIPE_PRICE_EMPIRE in Replit Secrets).
const TIER_CONFIG: Record<string, { tier: string; name: string; amount: number }> = {
  builder:  { tier: "builder",  name: "Builder",  amount: 2900  }, // $29/mo
  operator: { tier: "operator", name: "Operator", amount: 9900  }, // $99/mo
  empire:   { tier: "empire",   name: "Empire",   amount: 49900 }, // $499/mo
  // Legacy aliases — kept so any existing Stripe webhook events continue to resolve
  pro:      { tier: "builder",  name: "Builder",  amount: 2900  },
  starter:  { tier: "builder",  name: "Builder",  amount: 2900  },
};

// What appears on the Stripe-hosted checkout page — must stay in sync with PricingPage.jsx.
const TIER_DISPLAY: Record<string, { productName: string; description: string }> = {
  builder:  {
    productName: "Starks Global Group — Builder Plan",
    description: "1,000 monthly AI credits · Build up to 5 systems · Full ASH AI Agent access · Revenue dashboard · System health monitoring · Email support",
  },
  operator: {
    productName: "Starks Global Group — Operator Plan",
    description: "5,000 monthly AI credits · Build up to 25 systems · Priority build queue · Advanced revenue intelligence · Team management · Email & chat support",
  },
  empire:   {
    productName: "Starks Global Group — Empire Plan",
    description: "25,000 monthly AI credits · Unlimited system builds & hosting · Unlimited integrations · Priority AI processing · White label ready · API access · Custom onboarding · Priority support",
  },
};

function getPriceId(tier: string): string | null {
  // Normalise legacy aliases to canonical tier name
  const canonical =
    tier === "starter" || tier === "pro" ? "builder" :
    tier;
  const envMap: Record<string, string | undefined> = {
    builder:  process.env.STRIPE_PRICE_BUILDER  ?? process.env.STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_STARTER,
    operator: process.env.STRIPE_PRICE_OPERATOR,
    empire:   process.env.STRIPE_PRICE_EMPIRE   ?? process.env.STRIPE_PRICE_OPERATOR,
  };
  return envMap[canonical] || null;
}

// Reverse-map a Stripe price ID back to an internal tier name.
function getTierFromPriceId(priceId: string): string | null {
  const reverseMap: Record<string, string> = {};
  const builder  = process.env.STRIPE_PRICE_BUILDER  ?? process.env.STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_STARTER;
  const operator = process.env.STRIPE_PRICE_OPERATOR;
  const empire   = process.env.STRIPE_PRICE_EMPIRE   ?? process.env.STRIPE_PRICE_OPERATOR;
  if (builder)  reverseMap[builder]  = "builder";
  if (operator) reverseMap[operator] = "operator";
  if (empire)   reverseMap[empire]   = "empire";
  return reverseMap[priceId] ?? null;
}

// GET /api/subscriptions/me
router.get("/subscriptions/me", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  res.json({ subscription: sub ? serialize(sub) : null });
});

// POST /api/subscriptions/checkout
router.post("/subscriptions/checkout", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({ tier: z.enum(["pro", "empire", "starter", "operator", "builder"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid tier" }); return; }

  const priceId = getPriceId(parsed.data.tier);
  if (!priceId) {
    res.status(503).json({
      error: "Stripe price IDs not yet configured. Create products in your Stripe dashboard and set the STRIPE_PRICE_* environment variables.",
      code: "stripe_prices_not_configured",
    });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const plan = TIER_CONFIG[parsed.data.tier];

  try {
    const stripe = await getUncachableStripeClient();

    // Sync the Stripe product name + description to match what PricingPage shows.
    // Do this before creating the session so the checkout page is always consistent.
    const display = TIER_DISPLAY[plan.tier];
    if (display) {
      try {
        const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
        const product = price.product;
        if (product && typeof product !== "string" && !("deleted" in product)) {
          await stripe.products.update(product.id, {
            name: display.productName,
            description: display.description,
          });
        }
      } catch (syncErr) {
        // Non-fatal: log and continue — checkout can still proceed with whatever name is in Stripe
        req.log.warn({ syncErr }, "Could not sync Stripe product metadata; continuing with checkout");
      }
    }

    // Get or create Stripe customer
    let customerId: string;
    const [existingSub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : "http://localhost:80";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&tier=${plan.tier}`,
      cancel_url: `${baseUrl}/subscribe/cancel`,
      metadata: { userId: String(userId), tier: plan.tier },
      subscription_data: { metadata: { userId: String(userId), tier: plan.tier } },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    req.log.error({ err }, "Stripe checkout error");
    const msg = err?.message?.includes("not found")
      ? "Stripe connection unavailable. Contact support to upgrade manually."
      : "Failed to create checkout session. Please try again.";
    res.status(500).json({ error: msg });
  }
});

// POST /api/stripe/webhook — raw body captured in app.ts before JSON parser
router.post("/stripe/webhook", async (req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";

    if (!webhookSecret) {
      if (isProduction) {
        // Refuse to process unverified webhooks in production — they could be forged to mint credits.
        req.log.error("STRIPE_WEBHOOK_SECRET not set in production; rejecting unverified webhook");
        res.status(503).json({ error: "Webhook signature verification not configured" });
        return;
      }
      // No webhook secret configured yet — accept and process without verification (dev only)
      req.log.warn("STRIPE_WEBHOOK_SECRET not set, skipping signature verification (dev only)");
    }

    // STRIPE_TEST_WEBHOOK_SECRET: secondary secret for a registered test-mode webhook endpoint.
    // Only active in non-production environments. In production, only STRIPE_WEBHOOK_SECRET is
    // accepted — preventing any test-mode event from being processed on live infrastructure.
    const testWebhookSecret = !isProduction ? process.env.STRIPE_TEST_WEBHOOK_SECRET : undefined;

    let event: any;
    if (webhookSecret) {
      const sig = req.headers["stripe-signature"] as string;
      const rawBody = (req as any).rawBody || req.body;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (primaryErr) {
        // Non-production only: try the test-mode endpoint secret if the primary fails.
        // This allows real Stripe-originated test-mode webhooks (from a registered test
        // endpoint) to be verified without replacing the live-mode STRIPE_WEBHOOK_SECRET.
        if (testWebhookSecret) {
          event = stripe.webhooks.constructEvent(rawBody, sig, testWebhookSecret);
          req.log.info("Stripe webhook verified with STRIPE_TEST_WEBHOOK_SECRET (test-mode endpoint)");
        } else {
          throw primaryErr;
        }
      }
    } else {
      event = req.body;
    }

    // Idempotency guard — Stripe retries/replays the same event id; apply each only once.
    if (event.id) {
      const [inserted] = await db
        .insert(processedStripeEventsTable)
        .values({ eventId: String(event.id) })
        .onConflictDoNothing()
        .returning();
      if (!inserted) {
        req.log.info({ eventId: event.id }, "Duplicate Stripe event ignored");
        res.json({ received: true, duplicate: true });
        return;
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      let userId = Number(session.metadata?.userId) || 0;
      const tier = session.metadata?.tier as string;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const amountTotal: number = session.amount_total ?? 0;

      // Fallback: if no userId in metadata, look up user by Stripe customer email.
      // This handles payments made outside the normal logged-in checkout flow.
      let resolvedStripeEmail: string | null = null;
      if (!userId && customerId) {
        try {
          const stripeCust = await stripe.customers.retrieve(customerId);
          if (stripeCust && !("deleted" in stripeCust) && stripeCust.email) {
            resolvedStripeEmail = stripeCust.email;
            const [found] = await db
              .select({ id: usersTable.id })
              .from(usersTable)
              .where(eq(usersTable.email, stripeCust.email));
            if (found) {
              userId = found.id;
              req.log.info({ userId, email: resolvedStripeEmail, customerId }, "Resolved userId from Stripe customer email (no metadata userId)");
            } else {
              req.log.warn({ email: resolvedStripeEmail, customerId }, "checkout.session.completed: Stripe customer email not found in users table — manual provisioning required");
            }
          }
        } catch (lookupErr) {
          req.log.warn({ lookupErr, customerId }, "Could not resolve userId from Stripe customer");
        }
      }

      // If we still have no userId after all resolution attempts and this was a real
      // (non-$0) charge, proactively alert all SUPER_ADMIN users so they can manually
      // provision the customer before a chargeback or support ticket arrives.
      if (!userId && amountTotal > 0) {
        const emailPart = resolvedStripeEmail ? ` (${resolvedStripeEmail})` : "";
        req.log.warn(
          { customerId, email: resolvedStripeEmail, amountTotal, sessionId: session.id },
          "checkout.session.completed: real payment received but userId unresolvable — notifying admins",
        );
        try {
          const superAdmins = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.role, "SUPER_ADMIN"));
          for (const admin of superAdmins) {
            await notifyUser({
              userId: admin.id,
              title: "⚠️ Unprovisioned Stripe Payment",
              message: `A payment of $${(amountTotal / 100).toFixed(2)} was received but the user could not be identified. Stripe customer: ${customerId ?? "unknown"}${emailPart}. Manual provisioning required.`,
              notificationType: "error",
              linkUrl: "/admin/stripe",
              dedupeKey: `unprovisioned_payment_${customerId ?? session.id}`,
            });
          }
        } catch (notifyErr) {
          req.log.warn({ notifyErr }, "Failed to notify admins of unprovisioned Stripe payment");
        }
      }

      if (session.metadata?.kind === "blueprint_purchase") {
        const blueprintId = Number(session.metadata?.blueprintId);
        if (userId && blueprintId) {
          const [bp] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, blueprintId));
          if (bp) {
            const priceCredits = bp.priceCredits ?? 0;
            const creatorShare = Math.floor(priceCredits * 0.7);

            // Insert purchase record — idempotent via unique constraint
            const [purchase] = await db
              .insert(blueprintPurchasesTable)
              .values({
                blueprintId,
                buyerUserId: userId,
                authorUserId: bp.authorUserId ?? null,
                priceCredits,
                creatorShareCredits: creatorShare,
              })
              .onConflictDoNothing()
              .returning();

            if (purchase) {
              // Pay creator 70%
              if (bp.authorUserId && creatorShare > 0) {
                await adjustWalletCredits(bp.authorUserId, creatorShare, {
                  reason: `Blueprint sale (Stripe card): "${bp.name}"`,
                });
              }
              // Increment salesCount
              await db
                .update(blueprintsTable)
                .set({ salesCount: (bp.salesCount ?? 0) + 1 })
                .where(eq(blueprintsTable.id, blueprintId));
              // Notify creator
              if (bp.authorUserId) {
                await db.insert(notificationsTable).values({
                  userId: bp.authorUserId,
                  title: "Blueprint Sold!",
                  message: `Your blueprint "${bp.name}" was purchased via card. You earned ${creatorShare} credits.`,
                  notificationType: "success",
                  read: false,
                }).catch(() => {});
              }
              req.log.info({ userId, blueprintId, priceCredits }, "Blueprint purchase fulfilled via Stripe");
            } else {
              req.log.info({ userId, blueprintId }, "Blueprint already purchased — Stripe duplicate event ignored");
            }
          }
        }
      } else if (session.metadata?.kind === "wallet_purchase") {
        const credits = Number(session.metadata?.credits);
        if (userId && credits > 0) {
          await adjustWalletCredits(userId, credits, { reason: `Wallet top-up: ${credits} credits` });
          req.log.info({ userId, credits }, "Wallet top-up completed");
        }
      } else if (userId && tier) {
        const priceId = getPriceId(tier);
        const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
        if (sub) {
          await db.update(subscriptionsTable)
            .set({ stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, tier, status: "active", stripePriceId: priceId })
            .where(eq(subscriptionsTable.userId, userId));
        } else {
          await db.insert(subscriptionsTable).values({
            userId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
            tier, status: "active", stripePriceId: priceId,
          });
        }
        await db.update(usersTable)
          .set({ membershipTier: tier, membershipStatus: "active" })
          .where(eq(usersTable.id, userId));
        await adjustCredits(userId, tierAllotment(tier), "tier_grant", { reason: `${tier} plan credits` });
        req.log.info({ userId, tier }, "Stripe webhook: subscription activated");

        // Referral reward — award referrer on first-ever subscription activation
        // 500 bonus credits + 20% of first month as wallet credits (fire-and-forget)
        ;(async () => {
          try {
            const [signupEvent] = await db
              .select()
              .from(referralEventsTable)
              .where(
                and(
                  eq(referralEventsTable.referredUserId, userId),
                  eq(referralEventsTable.eventType, "signup"),
                ),
              );
            if (!signupEvent) return;

            // Ensure this is the first conversion (idempotency)
            const [alreadyConverted] = await db
              .select({ id: referralEventsTable.id })
              .from(referralEventsTable)
              .where(
                and(
                  eq(referralEventsTable.referrerId, signupEvent.referrerId),
                  eq(referralEventsTable.referredUserId, userId),
                  eq(referralEventsTable.eventType, "conversion"),
                ),
              );
            if (alreadyConverted) return;

            const amountCents = Number(session.amount_total ?? 0) ||
              (TIER_CONFIG[tier]?.amount ?? 0);
            const bonusCredits = 500;
            const revenueShareCredits = Math.round(amountCents * 0.20 / 100 * 50);
            const totalCredits = bonusCredits + revenueShareCredits;

            await adjustCredits(signupEvent.referrerId, bonusCredits, "signup_grant", {
              reason: `Referral bonus — ${tier} plan signup`,
            });
            await adjustWalletCredits(signupEvent.referrerId, revenueShareCredits, {
              reason: `Referral revenue share — 20% of ${tier} first month`,
            });

            await db.insert(referralEventsTable).values({
              referrerId: signupEvent.referrerId,
              referredUserId: userId,
              eventType: "conversion",
              creditsAwarded: totalCredits,
            });

            await db
              .update(referralCodesTable)
              .set({ conversions: sql`${referralCodesTable.conversions} + 1` })
              .where(eq(referralCodesTable.userId, signupEvent.referrerId));

            await db.insert(notificationsTable).values({
              userId: signupEvent.referrerId,
              title: "Referral Earned!",
              message: `Your referral subscribed to the ${tier} plan. You earned ${bonusCredits} bonus credits + ${revenueShareCredits} wallet credits!`,
              notificationType: "success",
              read: false,
            }).catch(() => {});

            req.log.info({ referrerId: signupEvent.referrerId, userId, tier, totalCredits }, "Referral reward awarded");
          } catch (err) {
            req.log.warn({ err, userId, tier }, "Failed to process referral reward");
          }
        })();
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.paused") {
      const sub = event.data.object as any;
      const userId = Number(sub.metadata?.userId);
      if (userId) {
        await db.update(subscriptionsTable).set({ status: "inactive", tier: "free" }).where(eq(subscriptionsTable.userId, userId));
        await db.update(usersTable).set({ membershipTier: "free", membershipStatus: "active" }).where(eq(usersTable.id, userId));
        req.log.info({ userId }, "Subscription cancelled — user downgraded to free tier");
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      const billingReason: string = invoice.billing_reason ?? "";

      // subscription_create is handled by checkout.session.completed — skip to avoid double credit grant.
      // subscription_update tier changes are handled by customer.subscription.updated.
      // Only grant fresh credits on subscription_cycle (monthly/annual renewals).
      const isRenewal = billingReason === "subscription_cycle";

      const userId = Number(invoice.subscription_details?.metadata?.userId);
      if (userId) {
        await db.update(subscriptionsTable).set({ status: "active" }).where(eq(subscriptionsTable.userId, userId));
        await db.update(usersTable).set({ membershipStatus: "active" }).where(eq(usersTable.id, userId));

        if (isRenewal) {
          // Look up the user's current tier from the subscriptions table — most authoritative source.
          const [sub] = await db
            .select({ tier: subscriptionsTable.tier })
            .from(subscriptionsTable)
            .where(eq(subscriptionsTable.userId, userId));
          const currentTier = sub?.tier ?? "free";
          const allotment = tierAllotment(currentTier);
          await adjustCredits(userId, allotment, "tier_grant", {
            reason: `Monthly renewal — ${currentTier} plan (${allotment} credits)`,
          });
          req.log.info({ userId, tier: currentTier, allotment, billingReason }, "Monthly credit renewal granted");
        } else {
          req.log.info({ userId, billingReason }, "Invoice paid — status re-activated (credits not re-granted)");
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const stripeSub = event.data.object as any;
      const customerId = stripeSub.customer as string;
      const stripeStatus: string = stripeSub.status ?? "active";

      // Resolve the new price ID from the first subscription item.
      const newPriceId: string | undefined = stripeSub.items?.data?.[0]?.price?.id;
      const newTier = newPriceId ? getTierFromPriceId(newPriceId) : null;

      // Map Stripe subscription status to our internal status.
      //   active / trialing          → "active"
      //   past_due / unpaid          → "past_due"  (keep access; billing team follows up)
      //   canceled / incomplete_expired / paused → "inactive"
      //   incomplete                 → skip (checkout not finished yet)
      if (stripeStatus === "incomplete") {
        res.json({ received: true });
        return;
      }
      const dbStatus =
        ["active", "trialing"].includes(stripeStatus)        ? "active"   :
        ["past_due", "unpaid"].includes(stripeStatus)        ? "past_due" :
                                                               "inactive";

      // Look up the subscription record by Stripe customer ID — this is
      // more reliable than subscription metadata because the session metadata
      // is set on checkout.session, not on the subscription object itself.
      const [existingSub] = await db
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.stripeCustomerId, customerId));

      if (existingSub) {
        const userId = existingSub.userId!;

        // Always sync status. Only change tier when the price maps to a known
        // tier (ignore plan changes to unrecognised prices, e.g. grandfathered).
        const subPatch: Record<string, string | null> = { status: dbStatus };
        const userPatch: Record<string, string> = {
          membershipStatus: dbStatus === "active" ? "active" : "inactive",
        };

        let lostOperationsAccess = false;
        if (newTier && newTier !== existingSub.tier) {
          subPatch.tier        = newTier;
          subPatch.stripePriceId = newPriceId ?? null;
          userPatch.membershipTier = newTier;
          // Detect a downgrade that removes ASH Operations Mode so we can warn
          // the user their autonomous automations will stop.
          lostOperationsAccess =
            hasOperationsModeAccess(existingSub.tier) && !hasOperationsModeAccess(newTier);
          req.log.info({ userId, from: existingSub.tier, to: newTier, stripeStatus, lostOperationsAccess },
            "Subscription tier changed");
        }

        await db.update(subscriptionsTable)
          .set(subPatch)
          .where(eq(subscriptionsTable.userId, userId));
        await db.update(usersTable)
          .set(userPatch)
          .where(eq(usersTable.id, userId));

        // Tier-change grace notification: tell the user what their plan change
        // means for their running automations, with a one-click path to restore.
        if (lostOperationsAccess) {
          await notifyUser({
            userId,
            notificationType: "warn",
            title: "ASH Operations Mode paused after plan change",
            message: `Your plan changed to ${newTier}, which doesn't include ASH Operations Mode. Your businesses stay saved, but continuous monitoring, content, and scheduling automation are paused. Upgrade to Operator or Empire to resume.`,
            linkUrl: "/pricing",
            dedupeKey: "operations_access_lost",
          });
        }

        req.log.info({ userId, stripeStatus, dbStatus, newTier }, "Subscription updated");
      } else {
        req.log.warn({ customerId }, "customer.subscription.updated: no matching subscription record found");
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    req.log.error({ err }, "Stripe webhook error");
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

// POST /api/subscriptions/portal — create a Stripe Customer Portal session
router.post("/subscriptions/portal", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));

  if (!sub?.stripeCustomerId) {
    res.status(404).json({ error: "No active subscription found. Upgrade to a paid plan first." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const returnUrl = domain ? `https://${domain}/credits` : "http://localhost:80/credits";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({ url: portalSession.url });
  } catch (err: any) {
    req.log.error({ err }, "Stripe billing portal error");
    const msg = err?.code === "resource_missing"
      ? "Billing portal is not configured in your Stripe dashboard. Enable it at dashboard.stripe.com/settings/billing/portal."
      : "Failed to open billing portal. Please try again.";
    res.status(500).json({ error: msg });
  }
});

// GET /api/subscriptions/publishable-key — for client-side Stripe.js
router.get("/subscriptions/publishable-key", async (_req, res): Promise<void> => {
  try {
    const { getStripePublishableKey } = await import("../lib/stripe");
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch {
    res.status(503).json({ error: "Stripe not configured" });
  }
});

export default router;
