import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { getUncachableStripeClient } from "../lib/stripe";

const JWT_SECRET = process.env["SESSION_SECRET"] || "sbep-fallback-secret-change-in-prod";

const requireAuth = (req: any, res: any): number | null => {
  const header = req.headers["authorization"] as string | undefined;
  if (!header?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return null; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    return Number(payload.sub);
  } catch { res.status(401).json({ error: "Invalid token" }); return null; }
};

const router: IRouter = Router();

// Tier config — price IDs are created in your Stripe dashboard
// Set STRIPE_PRICE_BUILDER, STRIPE_PRICE_OPERATOR, STRIPE_PRICE_EMPIRE env vars
// once you've created the products/prices in Stripe
const TIER_CONFIG: Record<string, { tier: string; name: string; amount: number }> = {
  builder:  { tier: "builder",  name: "Builder",  amount: 2900  },
  operator: { tier: "operator", name: "Operator", amount: 9900  },
  empire:   { tier: "empire",   name: "Empire",   amount: 49900 },
};

function getPriceId(tier: string): string | null {
  const envMap: Record<string, string | undefined> = {
    builder:  process.env.STRIPE_PRICE_BUILDER,
    operator: process.env.STRIPE_PRICE_OPERATOR,
    empire:   process.env.STRIPE_PRICE_EMPIRE,
  };
  return envMap[tier] || null;
}

// GET /api/subscriptions/me
router.get("/subscriptions/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (userId === null) return;
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  res.json({ subscription: sub ? serialize(sub) : null });
});

// POST /api/subscriptions/checkout
router.post("/subscriptions/checkout", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (userId === null) return;

  const schema = z.object({ tier: z.enum(["builder", "operator", "empire"]) });
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

    if (!webhookSecret) {
      // No webhook secret configured yet — accept and process without verification (dev only)
      req.log.warn("STRIPE_WEBHOOK_SECRET not set, skipping signature verification");
    }

    let event: any;
    if (webhookSecret) {
      const sig = req.headers["stripe-signature"] as string;
      event = stripe.webhooks.constructEvent((req as any).rawBody || req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const userId = Number(session.metadata?.userId);
      const tier = session.metadata?.tier as string;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (userId && tier) {
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
        req.log.info({ userId, tier }, "Subscription activated via checkout");
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.paused") {
      const sub = event.data.object as any;
      const userId = Number(sub.metadata?.userId);
      if (userId) {
        await db.update(subscriptionsTable).set({ status: "inactive", tier: "starter" }).where(eq(subscriptionsTable.userId, userId));
        await db.update(usersTable).set({ membershipTier: "starter", membershipStatus: "inactive" }).where(eq(usersTable.id, userId));
        req.log.info({ userId }, "Subscription deactivated");
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      const userId = Number(invoice.subscription_details?.metadata?.userId);
      if (userId) {
        await db.update(subscriptionsTable).set({ status: "active" }).where(eq(subscriptionsTable.userId, userId));
        await db.update(usersTable).set({ membershipStatus: "active" }).where(eq(usersTable.id, userId));
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
