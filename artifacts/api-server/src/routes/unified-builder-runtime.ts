// ── Build 049: UBRE REST routes ───────────────────────────────────────────────
import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../lib/auth";
import {
  startSession, endSession, getActiveSession, listActiveSessions,
} from "../lib/unified-builder-runtime/runtime-session-engine";
import {
  saveDraft, getLatestDraft, getDraftHistory,
} from "../lib/unified-builder-runtime/draft-engine";
import { getHistory, undo, redo } from "../lib/unified-builder-runtime/history-engine";
import { runValidation } from "../lib/unified-builder-runtime/validation-engine";
import {
  recoverSession, listPendingRecoveries,
} from "../lib/unified-builder-runtime/recovery-engine";
import {
  getEvents, getActiveLocks, getRuntimeRegistry, getDiagnostics,
  getSnapshots, getBuilderHealth, captureUBRESnapshot,
} from "../lib/unified-builder-runtime/ubre-orchestrator";
import type { BuilderType } from "../lib/unified-builder-runtime/types";

const router = Router();

// ── POST /runtime/session — start or end a builder session ───────────────────
router.post("/session", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { action, builderType, assetId, projectId, businessId, metadata, sessionId } = req.body;

  if (action === "end") {
    if (!sessionId) { res.status(400).json({ error: "sessionId required to end session" }); return; }
    await endSession(Number(sessionId), userId);
    res.json({ success: true, action: "ended" });
    return;
  }

  // Default: start
  if (!builderType) { res.status(400).json({ error: "builderType is required" }); return; }

  const result = await startSession({
    userId,
    builderType: builderType as BuilderType,
    assetId:     assetId   ? Number(assetId)   : undefined,
    projectId:   projectId ? Number(projectId) : undefined,
    businessId:  businessId ? Number(businessId) : undefined,
    metadata,
  });

  res.status(201).json(result);
});

// ── POST /runtime/autosave ────────────────────────────────────────────────────
router.post("/autosave", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { sessionId, builderType, content, assetId, changesSummary, isAutosave } = req.body;
  if (!sessionId || !builderType || !content) {
    res.status(400).json({ error: "sessionId, builderType, and content are required" });
    return;
  }

  const result = await saveDraft({
    sessionId:    Number(sessionId),
    userId,
    builderType,
    assetId:      assetId ? Number(assetId) : undefined,
    content,
    changesSummary,
    isAutosave:   isAutosave !== false, // default true
  });

  res.status(201).json(result);
});

// ── POST /runtime/validate ────────────────────────────────────────────────────
router.post("/validate", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { sessionId, builderType, content, draftId, validationType } = req.body;
  if (!sessionId || !builderType || !content) {
    res.status(400).json({ error: "sessionId, builderType, and content are required" });
    return;
  }

  const result = await runValidation({
    sessionId:      Number(sessionId),
    userId,
    builderType:    builderType as BuilderType,
    content,
    draftId:        draftId ? Number(draftId) : undefined,
    validationType: (validationType ?? "manual") as "pre_publish" | "on_save" | "manual" | "autosave",
  });

  res.status(result.overallStatus === "fail" ? 422 : 200).json(result);
});

// ── POST /runtime/recover ─────────────────────────────────────────────────────
router.post("/recover", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { recoveryId, newSessionId } = req.body;
  if (!recoveryId) { res.status(400).json({ error: "recoveryId is required" }); return; }

  const result = await recoverSession({
    recoveryId:   Number(recoveryId),
    userId,
    newSessionId: newSessionId ? Number(newSessionId) : undefined,
  });

  res.status(result.success ? 200 : 404).json(result);
});

// ── POST /runtime/undo ────────────────────────────────────────────────────────
router.post("/undo", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { sessionId } = req.body;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const result = await undo(Number(sessionId), userId);
  res.json(result);
});

// ── POST /runtime/redo ────────────────────────────────────────────────────────
router.post("/redo", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { sessionId } = req.body;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const result = await redo(Number(sessionId), userId);
  res.json(result);
});

// ── GET /runtime/session ──────────────────────────────────────────────────────
router.get("/session", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { builderType, assetId } = req.query;
  if (builderType) {
    const session = await getActiveSession(userId, builderType as BuilderType, assetId ? Number(assetId) : undefined);
    res.json(session ?? { active: false });
    return;
  }

  const sessions = await listActiveSessions(userId);
  res.json(sessions);
});

// ── GET /runtime/history ──────────────────────────────────────────────────────
router.get("/history", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { sessionId, limit } = req.query;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const history = await getHistory(Number(sessionId), limit ? Number(limit) : 50);
  res.json(history);
});

// ── GET /runtime/drafts ───────────────────────────────────────────────────────
router.get("/drafts", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { sessionId, limit } = req.query;
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const drafts = await getDraftHistory(Number(sessionId), limit ? Number(limit) : 20);
  res.json(drafts);
});

// ── GET /runtime/events ───────────────────────────────────────────────────────
router.get("/events", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { limit } = req.query;
  const events = await getEvents(userId, limit ? Number(limit) : 50);
  res.json(events);
});

// ── GET /runtime/locks ────────────────────────────────────────────────────────
router.get("/locks", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const locks = await getActiveLocks(userId);
  res.json(locks);
});

// ── GET /runtime/registry ─────────────────────────────────────────────────────
router.get("/registry", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const registry = await getRuntimeRegistry(userId);
  res.json(registry);
});

// ── GET /runtime/recovery ─────────────────────────────────────────────────────
router.get("/recovery", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const recoveries = await listPendingRecoveries(userId);
  res.json(recoveries);
});

// ── GET /runtime/snapshots ────────────────────────────────────────────────────
router.get("/snapshots", async (_req: Request, res: Response) => {
  const snapshots = await getSnapshots(20);
  res.json(snapshots);
});

// ── GET /runtime/diagnostics ──────────────────────────────────────────────────
router.get("/diagnostics", async (_req: Request, res: Response) => {
  const diagnostics = await getDiagnostics(50);
  res.json(diagnostics);
});

// ── GET /runtime/health ───────────────────────────────────────────────────────
router.get("/health", async (_req: Request, res: Response) => {
  const health = await getBuilderHealth();
  res.json(health);
});

// ── POST /runtime/snapshot (manual capture) ───────────────────────────────────
router.post("/snapshot", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  await captureUBRESnapshot(userId);
  res.json({ success: true });
});

export { router as unifiedBuilderRuntimeRouter };
