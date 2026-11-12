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
router.get("/readyz", async (_req, res) => {
  const started = Date.now();
  try {
    await Promise.race([
      pool.query("select 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    res.json({ status: "ready", db: "ok", latencyMs: Date.now() - started });
  } catch {
    res.status(503).json({ status: "unavailable", db: "unreachable" });
  }
});

export default router;
