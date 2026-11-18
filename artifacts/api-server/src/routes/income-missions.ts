import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import {
  draftIncomePlan, getIncomePlan, listIncomePlans, approveIncomePlan, rejectIncomePlan, getMissionDashboard,
} from "../lib/income-missions";
import { checkCapabilities, capabilitiesForPlan } from "../lib/capabilities";
import type { IncomePlan } from "@workspace/db";

const router: IRouter = Router();
const bad = (res: Response, error: string, status = 400) => void res.status(status).json({ error });
// The plan with a live check of what ASH can do for it, so the owner sees what to connect before approving.
const withCheck = async (userId: number, p: IncomePlan) =>
  ({ ...serialize(p), capabilityCheck: await checkCapabilities(userId, p.plan.capabilities ?? capabilitiesForPlan(p.plan)) });
const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

router.get("/income-plans", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  res.json(serialize(await listIncomePlans(caller.id)));
});

router.post("/income-plans", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = z.object({ goal: z.string().min(8).max(2000) }).safeParse(req.body);
  if (!body.success) return bad(res, "Describe the income goal (8 to 2000 characters)");
  const r = await draftIncomePlan(caller.id, body.data.goal);
  if ("error" in r) return bad(res, r.error, 502);
  res.status(201).json(await withCheck(caller.id, r.plan));
});

router.get("/income-plans/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  if (!id) return bad(res, "Invalid plan id");
  const p = await getIncomePlan(caller.id, id);
  if (!p) return bad(res, "Not found", 404);
  res.json(await withCheck(caller.id, p));
});

router.post("/income-plans/:id/:action", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  if (!id) return bad(res, "Invalid plan id");
  const action = req.params["action"];
  if (action === "approve") {
    const r = await approveIncomePlan(caller.id, id);
    if ("error" in r) return bad(res, r.error, r.status);
    res.json(serialize(r.plan));
    return;
  }
  if (action === "reject") {
    const p = await rejectIncomePlan(caller.id, id);
    if (!p) return bad(res, "Plan not found or already decided", 409);
    res.json(serialize(p));
    return;
  }
  bad(res, "Unknown action", 404);
});

router.get("/missions/:id/dashboard", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  if (!id) return bad(res, "Invalid mission id");
  const d = await getMissionDashboard(caller.id, id);
  if (!d) return bad(res, "Not found", 404);
  res.json(serialize(d));
});

export default router;
