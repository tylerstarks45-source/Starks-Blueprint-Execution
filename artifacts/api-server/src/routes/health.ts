import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Readiness: the process is up AND the database answers. Use this for load
// balancer / uptime checks; /healthz only proves the process is alive.
// One probe at a time: if the DB stalls, later probes share the pending query
// instead of piling more onto the pool.
let pendingProbe: Promise<unknown> | null = null;

router.get("/readyz", async (_req, res) => {
  const started = Date.now();
  if (!pendingProbe) {
    pendingProbe = pool.query("select 1").finally(() => { pendingProbe = null; });
  }
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      pendingProbe,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 3000); }),
    ]);
    res.json({ status: "ready", db: "ok", latencyMs: Date.now() - started });
  } catch {
    res.status(503).json({ status: "unavailable", db: "unreachable" });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
