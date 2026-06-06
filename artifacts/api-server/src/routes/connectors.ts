import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuthActive } from "../lib/auth";
import { listConnectors, getConnector, isKnownConnector } from "../lib/connectors/registry";
import { enqueue } from "../lib/runtime/jobs";

const router: IRouter = Router();

// GET /api/connectors — list all connectors with metadata
router.get("/connectors", async (_req, res): Promise<void> => {
  res.json(listConnectors());
});

// POST /api/connectors/:id/test — live test a connector (with optional credentials)
router.post("/connectors/:id/test", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const connectorId = req.params["id"]!;
  if (!isKnownConnector(connectorId)) {
    res.status(404).json({ error: `Unknown connector: ${connectorId}` });
    return;
  }

  const schema = z.object({
    credentials: z.record(z.string()).optional(),
    systemInstanceId: z.number().int().optional(),
    async: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { credentials = {}, systemInstanceId, async: runAsync } = parsed.data;

  // Async mode: enqueue a job and return immediately
  if (runAsync && systemInstanceId) {
    const jobId = await enqueue(
      "connector_test",
      { connectorId, systemInstanceId, credentials },
      { systemInstanceId, priority: 2 },
    );
    res.json({ queued: true, jobId });
    return;
  }

  // Sync mode: test inline and return result
  const connector = getConnector(connectorId, credentials);
  if (!connector) {
    res.status(404).json({ error: "Connector not found" });
    return;
  }

  const result = await connector.testConnection();
  res.json({
    connectorId,
    ...result,
    meta: connector.describe(),
  });
});

export default router;
