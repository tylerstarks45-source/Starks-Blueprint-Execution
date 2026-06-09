import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getUncachableStripeClient } from "../lib/stripe";
import { requireAuthActive } from "../lib/auth";
import {
  TIER_ALLOTMENTS,
  TIER_NAMES,
  TIER_PRICES,
  WALLET_TIERS,
  listTransactions,
  tierAllotment,
} from "../lib/credits";
import {
  GetMyCreditsResponse,
  ListMyCreditTransactionsResponse,
  GetCreditConfigResponse,
  CreateCreditCheckoutBody,
  CreateCreditCheckoutResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /api/credits/me
router.get("/credits/me", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const tier = user.membershipTier ?? "free";
  res.json(GetMyCreditsResponse.parse(serialize({
    balance: user.creditsBalance ?? 0,
    walletBalance: user.walletBalance ?? 0,
    tier,
    tierAllotment: tierAllotment(tier),
  })));
});

// GET /api/credits/transactions
router.get("/credits/transactions", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await listTransactions(userId, 100);
  res.json(ListMyCreditTransactionsResponse.parse(serialize(rows)));
});

// GET /api/credits/config — public tier allotments + wallet top-up tiers
router.get("/credits/config", async (_req, res): Promise<void> => {
  const tiers = Object.keys(TIER_ALLOTMENTS).map((t) => ({
    tier: t,
    name: TIER_NAMES[t] ?? t,
    allotment: TIER_ALLOTMENTS[t],
    monthlyPrice: TIER_PRICES[t] ?? 0,
  }));
  const walletTiers = Object.values(WALLET_TIERS).map((p) => ({
    id: p.id,
    name: p.name,
    credits: p.credits,
    priceCents: p.priceCents,
    dollarAmount: p.dollarAmount,
    saving: p.saving ?? null,
  }));
  res.json(GetCreditConfigResponse.parse({ tiers, walletTiers }));
});

// POST /api/credits/checkout — Stripe checkout to top up credit wallet
router.post("/credits/checkout", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = CreateCreditCheckoutBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const tier = WALLET_TIERS[parsed.data.walletTier];
  if (!tier) { res.status(400).json({ error: "Unknown wallet tier" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : "http://localhost:80";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: tier.priceCents,
          product_data: {
            name: `Starks Global Group — ${tier.credits.toLocaleString()} AI Credits`,
            description: `One-time top-up of ${tier.credits.toLocaleString()} permanent AI credits. Credits never expire and are applied to your account immediately after purchase.`,
          },
        },
      }],
      success_url: `${baseUrl}/credits?wallet_topped_up=1`,
      cancel_url: `${baseUrl}/credits?wallet_canceled=1`,
      metadata: {
        userId: String(userId),
        kind: "wallet_purchase",
        credits: String(tier.credits),
        walletTier: tier.id,
      },
    });

    res.json(CreateCreditCheckoutResponse.parse({ url: session.url, sessionId: session.id }));
  } catch (err: any) {
    req.log.error({ err }, "Wallet checkout error");
    res.status(500).json({ error: "Failed to create checkout session. Please try again." });
  }
});

export default router;
