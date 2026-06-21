import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, systemInstancesTable, systemConnectorsTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import {
  deploySystem,
  pauseSystem,
  restartSystem,
  archiveSystem,
  DeploymentError,
} from "../lib/runtime/deployment";
import { getJobsBySystem, getJobById, enqueue, cancelSystemJobs } from "../lib/runtime/jobs";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

// Ensure caller owns the system instance. Returns instance or null + sends 403/404.
async function requireOwner(req: import("express").Request, res: import("express").Response, id: number) {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return null;

  const [instance] = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, id));

  if (!instance) { res.status(404).json({ error: "System not found" }); return null; }
  if (instance.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return null; }
  return instance;
}

// POST /api/runtime/systems/:id/deploy
router.post("/runtime/systems/:id/deploy", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const instance = await requireOwner(req, res, id);
  if (!instance) return;

  try {
    await deploySystem(id);
    res.json({ success: true, message: "Deployment started", systemId: id, status: "deploying" });
  } catch (err) {
    if (err instanceof DeploymentError) {
      res.status(400).json({ error: err.message, code: err.code });
    } else {
      res.status(500).json({ error: "Deployment failed" });
    }
  }
});

// POST /api/runtime/systems/:id/pause
router.post("/runtime/systems/:id/pause", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const instance = await requireOwner(req, res, id);
  if (!instance) return;

  try {
    await pauseSystem(id);
    res.json({ success: true, message: "System paused", systemId: id, status: "paused" });
  } catch (err) {
    if (err instanceof DeploymentError) {
      res.status(400).json({ error: err.message, code: err.code });
    } else {
      res.status(500).json({ error: "Pause failed" });
    }
  }
});

// POST /api/runtime/systems/:id/restart
router.post("/runtime/systems/:id/restart", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const instance = await requireOwner(req, res, id);
  if (!instance) return;

  try {
    await restartSystem(id);
    res.json({ success: true, message: "System restart initiated", systemId: id, status: "deploying" });
  } catch (err) {
    if (err instanceof DeploymentError) {
      res.status(400).json({ error: err.message, code: err.code });
    } else {
      res.status(500).json({ error: "Restart failed" });
    }
  }
});

// DELETE /api/runtime/systems/:id — archive (soft delete)
router.delete("/runtime/systems/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const instance = await requireOwner(req, res, id);
  if (!instance) return;

  try {
    await archiveSystem(id);
    res.json({ success: true, message: "System archived", systemId: id });
  } catch (err) {
    res.status(500).json({ error: "Archive failed" });
  }
});

// GET /api/runtime/systems/:id/status
router.get("/runtime/systems/:id/status", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const instance = await requireOwner(req, res, id);
  if (!instance) return;

  const connectors = await db
    .select()
    .from(systemConnectorsTable)
    .where(eq(systemConnectorsTable.systemInstanceId, id));

  const recentJobs = await getJobsBySystem(id, 10);

  res.json({
    systemId: id,
    buildStatus: instance.buildStatus,
    healthStatus: instance.healthStatus,
    connectors: serialize(connectors),
    recentJobs: serialize(recentJobs),
  });
});

// GET /api/runtime/systems/:id/jobs
router.get("/runtime/systems/:id/jobs", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const instance = await requireOwner(req, res, id);
  if (!instance) return;

  const jobs = await getJobsBySystem(id, 100);
  res.json(serialize(jobs));
});

// GET /api/runtime/systems/:id/connectors
router.get("/runtime/systems/:id/connectors", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const instance = await requireOwner(req, res, id);
  if (!instance) return;

  const connectors = await db
    .select()
    .from(systemConnectorsTable)
    .where(eq(systemConnectorsTable.systemInstanceId, id));

  res.json(serialize(connectors));
});

// GET /api/runtime/jobs/:jobId
// Unified job status endpoint — handles both system runtime jobs and media gen jobs.
// For media jobs (media_gen_video / media_gen_audio) it delegates to the media-gen
// polling endpoint which contacts the external provider (HeyGen / Runway) live.
router.get("/runtime/jobs/:jobId", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const job = await getJobById(req.params["jobId"]!);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const isMediaJob =
    job.jobType === "media_gen_video" || job.jobType === "media_gen_audio";

  if (isMediaJob) {
    // Media jobs own their userId directly in payload (no systemInstanceId)
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    if (payload["userId"] !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // For in-flight jobs, proxy to media-gen polling so provider status is live
    if (job.status === "active" || job.status === "queued") {
      try {
        const pollRes = await fetch(
          `http://localhost:${process.env.PORT ?? 8080}/api/media-gen/jobs/${job.jobId}`,
          { headers: { Authorization: (req.headers["authorization"] as string) ?? "" } },
        );
        if (pollRes.ok) {
          res.json(await pollRes.json());
          return;
        }
      } catch { /* fall through to DB result */ }
    }

    // Settled or proxy failed — return stored result from DB
    const result = (job.result ?? {}) as Record<string, unknown>;
    res.json({
      jobId: job.jobId,
      jobType: job.jobType,
      status: job.status,
      provider: payload["provider"] ?? null,
      mediaUrl: result["mediaUrl"] ?? null,
      thumbnailUrl: result["thumbnailUrl"] ?? null,
      fileId: result["fileId"] ?? null,
      error: job.error ?? null,
      completedAt: job.completedAt ?? null,
    });
    return;
  }

  // Verify ownership via system instance
  if (job.systemInstanceId) {
    const [instance] = await db
      .select({ userId: systemInstancesTable.userId })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.id, job.systemInstanceId));
    if (!instance || instance.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  res.json(serialize(job));
});

// POST /api/runtime/jobs/:jobId/retry — manually retry a failed job
router.post("/runtime/jobs/:jobId/retry", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const job = await getJobById(req.params["jobId"]!);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.status !== "failed") {
    res.status(400).json({ error: "Only failed jobs can be retried" });
    return;
  }

  // Re-enqueue with same payload
  const newJobId = await enqueue(
    job.jobType as any,
    (job.payload ?? {}) as Record<string, unknown>,
    { systemInstanceId: job.systemInstanceId ?? undefined, priority: job.priority },
  );

  res.json({ success: true, newJobId });
});

// GET /api/runtime/health — overall worker health
router.get("/runtime/health", async (_req, res): Promise<void> => {
  const result = await db.execute<{ status: string; cnt: string }>(
    `SELECT status, COUNT(*) as cnt FROM runtime_jobs 
     WHERE queued_at > NOW() - INTERVAL '24 hours'
     GROUP BY status` as any,
  );
  const stats: Record<string, number> = {};
  for (const row of (result as any).rows ?? []) {
    stats[row.status] = Number(row.cnt);
  }
  res.json({ worker: "running", jobs24h: stats });
});

export default router;
