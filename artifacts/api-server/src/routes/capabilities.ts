import { Router, type IRouter } from "express";
import { z } from "zod";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { getCapabilityMap, listCapabilityRequests, requestMissingCapabilities, dismissCapabilityRequest } from "../lib/capabilities";
import { slugifyKey } from "../lib/empire/business-types";

const router: IRouter = Router();

router.get("/capabilities", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const [capabilities, requests] = await Promise.all([getCapabilityMap(caller.id), listCapabilityRequests(caller.id)]);
  res.json({ capabilities, requests: serialize(requests) });
});

router.post("/capability-requests", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const body = z.object({ capability: z.string().min(2).max(60), reason: z.string().max(500).optional() }).safeParse(req.body);
  const key = body.success ? slugifyKey(body.data.capability) : "";
  if (!body.success || !key) { res.status(400).json({ error: "Name the capability (2 to 60 characters)" }); return; }
  const created = await requestMissingCapabilities(caller.id, [key], { reason: body.data.reason });
  res.status(created.length ? 201 : 200).json({ created: serialize(created) });
});

router.post("/capability-requests/:id/dismiss", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = Number(req.params["id"]);
  const r = Number.isInteger(id) && id > 0 ? await dismissCapabilityRequest(caller.id, id) : null;
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(r));
});

export default router;
