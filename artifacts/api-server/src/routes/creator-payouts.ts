import { Router, type IRouter } from "express";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { payoutSummary, onboardingLink, refreshAccount, withdraw, PayoutError } from "../lib/creator-payouts";

const router: IRouter = Router();

function appBaseUrl(): string {
  if (process.env["APP_URL"]) return process.env["APP_URL"].replace(/\/+$/, "");
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  return domain ? `https://${domain}` : "http://localhost:80";
}

router.get("/creator/payouts", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  res.json(serialize(await payoutSummary(caller.id)));
});

// Identity and bank details are collected by Stripe on its hosted page — an owner-only step.
router.post("/creator/payouts/onboard", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  try {
    res.json({ url: await onboardingLink(caller.id, appBaseUrl()) });
  } catch (err) {
    req.log.error({ err: String((err as Error)?.message ?? err) }, "Creator payout onboarding failed");
    res.status(502).json({ error: "Couldn't reach Stripe to set up payouts. Try again shortly." });
  }
});

router.post("/creator/payouts/refresh", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  try {
    await refreshAccount(caller.id);
    res.json(serialize(await payoutSummary(caller.id)));
  } catch (err) {
    req.log.warn({ err: String((err as Error)?.message ?? err) }, "Creator payout account refresh failed");
    res.status(502).json({ error: "Couldn't check your payout account with Stripe." });
  }
});

router.post("/creator/payouts/withdraw", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  try {
    const payout = await withdraw(caller.id);
    res.json(serialize({ payout, summary: await payoutSummary(caller.id) }));
  } catch (err) {
    if (err instanceof PayoutError) { res.status(err.status).json({ error: err.message }); return; }
    throw err;
  }
});

export default router;
