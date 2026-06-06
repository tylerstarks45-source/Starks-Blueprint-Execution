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
  CREDIT_PACKS,
  getBalance,
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
  res.json(GetMyCreditsResponse.parse({
    balance: user.creditsBalance ?? 0,
    tier,
    tierAllotment: tierAllotment(tier),
  }));
});

// GET /api/credits/transactions
router.get("/credits/transactions", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await listTransactions(userId, 100);
  res.json(ListMyCreditTransactionsResponse.parse(serialize(rows)));
});

// GET /api/credits/config — public tier allotments + credit packs
router.get("/credits/config", async (_req, res): Promise<void> => {
  const tiers = Object.keys(TIER_ALLOTMENTS).map((t) => ({
    tier: t,
    name: TIER_NAMES[t] ?? t,
    allotment: TIER_ALLOTMENTS[t],
    monthlyPrice: TIER_PRICES[t] ?? 0,
  }));
  const packs = Object.values(CREDIT_PACKS).map((p) => ({
    id: p.id,
    name: p.name,
    credits: p.credits,
    priceCents: p.priceCents,
  }));
  res.json(GetCreditConfigResponse.parse({ tiers, packs }));
});

// POST /api/credits/checkout — one-time Stripe checkout for a credit pack
router.post("/credits/checkout", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = CreateCreditCheckoutBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const pack = CREDIT_PACKS[parsed.data.pack];
  if (!pack) { res.status(400).json({ error: "Unknown credit pack" }); return; }

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
          unit_amount: pack.priceCents,
          product_data: { name: `SBEP ${pack.name}` },
        },
      }],
      success_url: `${baseUrl}/dashboard?credits_purchased=1`,
      cancel_url: `${baseUrl}/dashboard?credits_canceled=1`,
      metadata: {
        userId: String(userId),
        kind: "credit_pack",
        credits: String(pack.credits),
        pack: pack.id,
      },
    });

    res.json(CreateCreditCheckoutResponse.parse({ url: session.url, sessionId: session.id }));
  } catch (err: any) {
    req.log.error({ err }, "Credit checkout error");
    res.status(500).json({ error: "Failed to create checkout session. Please try again." });
  }
});

export default router;
