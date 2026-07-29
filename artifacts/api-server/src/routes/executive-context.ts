// ─── Executive Context Engine — API Routes (Build 006) ───────────────────────
//
// REST API surface for the Executive Context Engine. All routes are under
// /api/executive-context. Every Brain and future system should consume context
// through these APIs rather than directly calling service modules.

import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  registerContext,
  getContext,
  listContexts,
  searchContexts,
  updateContext,
  activateContext,
  deactivateContext,
  archiveContext,
  validateContext,
  addContextEntityLink,
  removeContextEntityLink,
  getContextEntityLinks,
} from "../lib/executive-context/context-registry";
import {
  resolveContextSnapshot,
  getSnapshot,
  getRecentSnapshots,
} from "../lib/executive-context/context-resolution";
import {
  getCurrentContext,
  getRelevantContext,
  getContextTimeline,
  getContextSummary,
  getContextDiagnostics,
} from "../lib/executive-context/context-services";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Context CRUD ─────────────────────────────────────────────────────────────

/**
 * POST /api/executive-context/contexts
 * Create a new Executive Context.
 */
router.post("/executive-context/contexts", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const input = req.body;
    const validation = validateContext(input);
    if (!validation.valid) {
      return res.status(400).json({ error: "Validation failed", details: validation.errors });
    }
    const context = await registerContext(input, userId);
    return res.status(201).json({ context, warnings: validation.warnings });
  } catch (err) {
    logger.warn({ err }, "POST /executive-context/contexts failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/**
 * GET /api/executive-context/contexts
 * List all contexts for the authenticated user, optionally filtered by status.
 */
router.get("/executive-context/contexts", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const limitRaw = Number(req.query["limit"]);
    const limit = isNaN(limitRaw) || limitRaw <= 0 ? 50 : limitRaw;
    const contexts = await listContexts(userId, status, limit);
    return res.json({ contexts, count: contexts.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/contexts failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/**
 * GET /api/executive-context/contexts/search?q=...
 * Full-text keyword search over name, description, purpose.
 */
router.get("/executive-context/contexts/search", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const q = typeof req.query["q"] === "string" ? req.query["q"] : "";
    if (!q.trim()) return res.json({ contexts: [], count: 0 });
    const contexts = await searchContexts(userId, q);
    return res.json({ contexts, count: contexts.length, query: q });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/contexts/search failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/**
 * GET /api/executive-context/contexts/:id
 * Retrieve a single context by id.
 */
router.get("/executive-context/contexts/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const context = await getContext(id);
    if (!context) return res.status(404).json({ error: "Context not found" });
    if (context.userId !== null && context.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    return res.json({ context });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/contexts/:id failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

/**
 * PATCH /api/executive-context/contexts/:id
 * Update an existing context.
 */
router.patch("/executive-context/contexts/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const updated = await updateContext(id, req.body, "user");
    return res.json({ context: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err }, "PATCH /executive-context/contexts/:id failed");
    return res.status(msg.includes("archived") ? 409 : 500).json({ error: msg });
  }
});

/**
 * DELETE /api/executive-context/contexts/:id
 * Archive a context (never hard-deleted — history must remain replayable).
 */
router.delete("/executive-context/contexts/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    await archiveContext(id, "user");
    return res.json({ archived: true, id });
  } catch (err) {
    logger.warn({ err }, "DELETE /executive-context/contexts/:id failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Lifecycle transitions ────────────────────────────────────────────────────

router.post("/executive-context/contexts/:id/activate", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    await activateContext(id, "user");
    return res.json({ activated: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(msg.includes("archived") ? 409 : 500).json({ error: msg });
  }
});

router.post("/executive-context/contexts/:id/deactivate", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    await deactivateContext(id, "user");
    return res.json({ deactivated: true, id });
  } catch (err) {
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Timeline ─────────────────────────────────────────────────────────────────

router.get("/executive-context/contexts/:id/timeline", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const limitRaw = Number(req.query["limit"]);
    const limit = isNaN(limitRaw) || limitRaw <= 0 ? 100 : limitRaw;
    const timeline = await getContextTimeline(id, limit);
    return res.json({ timeline, count: timeline.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/contexts/:id/timeline failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

router.get("/executive-context/contexts/:id/summary", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const summary = await getContextSummary(id);
    if (!summary) return res.status(404).json({ error: "Summary not available" });
    return res.json({ summary });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/contexts/:id/summary failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Entity Links ─────────────────────────────────────────────────────────────

router.get("/executive-context/contexts/:id/links", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const entityType = typeof req.query["entityType"] === "string" ? req.query["entityType"] : undefined;
    const links = await getContextEntityLinks(id, entityType);
    return res.json({ links, count: links.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/contexts/:id/links failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.post("/executive-context/contexts/:id/links", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getContext(id);
    if (!existing) return res.status(404).json({ error: "Context not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { entityType, entityId, description } = req.body as {
      entityType?: string;
      entityId?: string;
      description?: string;
    };
    if (!entityType || !entityId) {
      return res.status(400).json({ error: "entityType and entityId are required" });
    }
    await addContextEntityLink(id, entityType, entityId, description ?? null, "user");
    return res.status(201).json({ linked: true });
  } catch (err) {
    logger.warn({ err }, "POST /executive-context/contexts/:id/links failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.delete(
  "/executive-context/contexts/:id/links/:entityType/:entityId",
  async (req: Request, res: Response) => {
    const userId = await requireAuthActive(req, res);
    if (!userId) return;
    try {
      const id = String(req.params["id"] ?? "");
      const entityType = String(req.params["entityType"] ?? "");
      const entityId = String(req.params["entityId"] ?? "");
      const existing = await getContext(id);
      if (!existing) return res.status(404).json({ error: "Context not found" });
      if (existing.userId !== null && existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await removeContextEntityLink(id, entityType, entityId);
      return res.json({ removed: true });
    } catch (err) {
      logger.warn({ err }, "DELETE /executive-context/contexts/:id/links/:type/:id failed");
      return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
    }
  },
);

// ─── Context Resolution ───────────────────────────────────────────────────────

/**
 * POST /api/executive-context/resolve
 * Resolve active contexts into one immutable Executive Context Snapshot.
 */
router.post("/executive-context/resolve", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const { objectiveText, persist = true } = req.body as {
      objectiveText?: string;
      persist?: boolean;
    };
    const snapshot = await resolveContextSnapshot(userId, objectiveText, { persist });
    return res.json({ snapshot });
  } catch (err) {
    logger.warn({ err }, "POST /executive-context/resolve failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Snapshots ────────────────────────────────────────────────────────────────

router.get("/executive-context/snapshots", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const limitRaw = Number(req.query["limit"]);
    const limit = isNaN(limitRaw) || limitRaw <= 0 ? 10 : limitRaw;
    const snapshots = await getRecentSnapshots(userId, limit);
    return res.json({ snapshots, count: snapshots.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/snapshots failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/executive-context/snapshots/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const snapshot = await getSnapshot(id);
    if (!snapshot) return res.status(404).json({ error: "Snapshot not found" });
    if (snapshot.userId !== null && snapshot.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    return res.json({ snapshot });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/snapshots/:id failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Diagnostics ─────────────────────────────────────────────────────────────

router.get("/executive-context/diagnostics", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const report = await getContextDiagnostics(userId);
    return res.json({ diagnostics: report });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/diagnostics failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Convenience endpoints ────────────────────────────────────────────────────

router.get("/executive-context/current", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const contexts = await getCurrentContext(userId);
    return res.json({ contexts, count: contexts.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/current failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/executive-context/relevant", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const objective = typeof req.query["objective"] === "string" ? req.query["objective"] : "";
    if (!objective.trim()) {
      return res.status(400).json({ error: "objective query parameter is required" });
    }
    const contexts = await getRelevantContext(userId, objective);
    return res.json({ contexts, count: contexts.length, objective });
  } catch (err) {
    logger.warn({ err }, "GET /executive-context/relevant failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.post("/executive-context/validate", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const result = validateContext(req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export default router;
