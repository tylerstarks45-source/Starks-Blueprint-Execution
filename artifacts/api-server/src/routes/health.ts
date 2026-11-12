import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { probeDatabase } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Readiness: the process is up AND the database answers. Use this for load
// balancer / uptime checks; /healthz only proves the process is alive.
// Single-flight: concurrent probes share one bounded check.
let pendingProbe: Promise<void> | null = null;

router.get("/readyz", async (_req, res) => {
  const started = Date.now();
  pendingProbe ??= probeDatabase(3000).finally(() => { pendingProbe = null; });
  try {
    await pendingProbe;
    res.json({ status: "ready", db: "ok", latencyMs: Date.now() - started });
  } catch {
    res.status(503).json({ status: "unavailable", db: "unreachable" });
  }
});

export default router;
