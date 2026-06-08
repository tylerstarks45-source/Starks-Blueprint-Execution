import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable, usersTable, processedStripeEventsTable } from "@workspace/db";
import { z } from "zod";
import { getUncachableStripeClient } from "../lib/stripe";
import { adjustCredits, adjustWalletCredits, tierAllotment } from "../lib/credits";
import { requireAuthActive } from "../lib/auth";

const router: IRouter = Router();

// Tier config — price IDs come from Stripe dashboard env vars.
// Current tiers: pro ($49/mo), empire ($199/mo).
// Legacy aliases: STRIPE_PRICE_STARTER / STRIPE_PRICE_BUILDER map to pro;
//                 STRIPE_PRICE_OPERATOR maps to empire.
const TIER_CONFIG: Record<string, { tier: string; name: string; amount: number }> = {
  pro:      { tier: "pro",      name: "Pro",      amount: 4900  }, // $49/mo
  empire:   { tier: "empire",   name: "Empire",   amount: 19900 }, // $199/mo
  // legacy aliases kept so existing Stripe webhook events still resolve
  starter:  { tier: "pro",      name: "Pro",      amount: 4900  },
  builder:  { tier: "pro",      name: "Pro",      amount: 4900  },
  operator: { tier: "empire",   name: "Empire",   amount: 19900 },
};

function getPriceId(tier: string): string | null {
  // Normalise legacy tiers to canonical name before looking up price ID
  const canonical = tier === "starter" || tier === "builder" ? "pro"
                  : tier === "operator" ? "empire"
                  : tier;
  const envMap: Record<string, string | undefined> = {
    pro:    process.env.STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_STARTER ?? process.env.STRIPE_PRICE_BUILDER,
    empire: process.env.STRIPE_PRICE_EMPIRE ?? process.env.STRIPE_PRICE_OPERATOR,
  };
  return envMap[canonical] || null;
}

// Reverse-map a Stripe price ID back to an internal tier name.
function getTierFromPriceId(priceId: string): string | null {
  const reverseMap: Record<string, string> = {};
  const pro    = process.env.STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_STARTER ?? process.env.STRIPE_PRICE_BUILDER;
  const empire = process.env.STRIPE_PRICE_EMPIRE ?? process.env.STRIPE_PRICE_OPERATOR;
  if (pro)    reverseMap[pro]    = "pro";
  if (empire) reverseMap[empire] = "empire";
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
      success_url: `${baseUrl}/pricing?success=1&tier=${plan.tier}`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
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

    let event: any;
    if (webhookSecret) {
      const sig = req.headers["stripe-signature"] as string;
      event = stripe.webhooks.constructEvent((req as any).rawBody || req.body, sig, webhookSecret);
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
      const userId = Number(session.metadata?.userId);
      const tier = session.metadata?.tier as string;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (session.metadata?.kind === "wallet_purchase") {
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
        req.log.info({ userId, tier }, "Subscription activated via checkout");
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

        if (newTier && newTier !== existingSub.tier) {
          subPatch.tier        = newTier;
          subPatch.stripePriceId = newPriceId ?? null;
          userPatch.membershipTier = newTier;
          req.log.info({ userId, from: existingSub.tier, to: newTier, stripeStatus },
            "Subscription tier changed");
        }

        await db.update(subscriptionsTable)
          .set(subPatch)
          .where(eq(subscriptionsTable.userId, userId));
        await db.update(usersTable)
          .set(userPatch)
          .where(eq(usersTable.id, userId));

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
