import { Router, type IRouter } from "express";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { listIntegrations, defineIntegration, testIntegration, setIntegrationStatus, deleteIntegration } from "../lib/custom-integrations";

const router: IRouter = Router();
const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

router.get("/custom-integrations", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  res.json(serialize(await listIntegrations(caller.id)));
});

router.post("/custom-integrations", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const r = await defineIntegration(caller.id, req.body);
  if ("error" in r) { res.status(400).json({ error: r.error }); return; }
  res.status(201).json(serialize(r.integration));
});

router.post("/custom-integrations/:id/test", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  const body = (req.body ?? {}) as { action?: unknown; params?: unknown };
  const params = body.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params as Record<string, unknown> : {};
  const r = id ? await testIntegration(caller.id, id, typeof body.action === "string" ? body.action : undefined, params, true) : null;
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ integration: serialize(r.integration), result: r.result });
});

router.post("/custom-integrations/:id/:action", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  if (!id || !["approve", "disable"].includes(req.params["action"] ?? "")) { res.status(404).json({ error: "Not found" }); return; }
  const r = await setIntegrationStatus(caller.id, id, req.params["action"] === "approve" ? "approved" : "disabled");
  if ("error" in r) { res.status(r.status ?? 409).json({ error: r.error }); return; }
  res.json(serialize(r.integration));
});

router.delete("/custom-integrations/:id", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  const r = id ? await deleteIntegration(caller.id, id) : null;
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;
