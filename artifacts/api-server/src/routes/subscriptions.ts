import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { z } from "zod";
import jwt from "jsonwebtoken";

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

// Price IDs map — set these after Stripe products are created
const PRICE_MAP: Record<string, { priceId: string; tier: string; name: string; amount: number }> = {
  builder: {
    priceId: process.env.STRIPE_PRICE_BUILDER || "price_builder",
    tier: "builder",
    name: "Builder",
    amount: 2900,
  },
  operator: {
    priceId: process.env.STRIPE_PRICE_OPERATOR || "price_operator",
    tier: "operator",
    name: "Operator",
    amount: 9900,
  },
  empire: {
    priceId: process.env.STRIPE_PRICE_EMPIRE || "price_empire",
    tier: "empire",
    name: "Empire",
    amount: 49900,
  },
};

// GET /api/subscriptions/me
router.get("/subscriptions/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (userId === null) return;
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));
  res.json({ subscription: sub ? serialize(sub) : null });
});

// POST /api/subscriptions/checkout
router.post("/subscriptions/checkout", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (userId === null) return;

  const schema = z.object({ tier: z.enum(["builder", "operator", "empire"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid tier" }); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(503).json({ error: "Payment system not configured. Contact support to upgrade manually.", code: "stripe_not_configured" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const plan = PRICE_MAP[parsed.data.tier];

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    // Get or create customer
    let customerId: string | undefined;
    const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
    if (existing?.stripeCustomerId) {
      customerId = existing.stripeCustomerId;
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
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${baseUrl}/pricing?success=1&tier=${plan.tier}`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      metadata: { userId: String(userId), tier: plan.tier },
      subscription_data: { metadata: { userId: String(userId), tier: plan.tier } },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    req.log.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "Failed to create checkout session. Please try again." });
  }
});

// POST /api/stripe/webhook  (raw body required — registered separately)
router.post("/stripe/webhook", async (req, res): Promise<void> => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    res.status(200).json({ received: true });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent((req as any).rawBody || req.body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const userId = Number(session.metadata?.userId);
      const tier = session.metadata?.tier;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (userId && tier) {
        const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
        if (sub) {
          await db.update(subscriptionsTable)
            .set({ stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, tier, status: "active", stripePriceId: PRICE_MAP[tier]?.priceId })
            .where(eq(subscriptionsTable.userId, userId));
        } else {
          await db.insert(subscriptionsTable).values({
            userId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
            tier, status: "active", stripePriceId: PRICE_MAP[tier]?.priceId,
          });
        }
        await db.update(usersTable)
          .set({ membershipTier: tier, membershipStatus: "active" })
          .where(eq(usersTable.id, userId));
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.paused") {
      const sub = event.data.object as any;
      const userId = Number(sub.metadata?.userId);
      if (userId) {
        await db.update(subscriptionsTable).set({ status: "inactive", tier: "starter" }).where(eq(subscriptionsTable.userId, userId));
        await db.update(usersTable).set({ membershipTier: "starter", membershipStatus: "inactive" }).where(eq(usersTable.id, userId));
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
    res.status(400).json({ error: "Webhook signature verification failed" });
  }
});

export default router;
