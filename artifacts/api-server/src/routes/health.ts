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
// If the DB stalls, later probes share the pending query instead of piling
// more onto the pool. A probe stuck longer than PROBE_STALE_MS is abandoned so
// readiness can recover; at most one new query per interval is added.
const PROBE_STALE_MS = 10_000;
let pendingProbe: { promise: Promise<unknown>; startedAt: number } | null = null;

router.get("/readyz", async (_req, res) => {
  const started = Date.now();
  if (!pendingProbe || started - pendingProbe.startedAt > PROBE_STALE_MS) {
    const probe = { startedAt: started, promise: Promise.resolve() as Promise<unknown> };
    probe.promise = pool.query("select 1").finally(() => {
      if (pendingProbe === probe) pendingProbe = null;
    });
    pendingProbe = probe;
  }
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      pendingProbe.promise,
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
