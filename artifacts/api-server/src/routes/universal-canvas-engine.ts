// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — UCE REST Routes
// 13 endpoints mounted at /api/canvas/*
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import { startSession, listViews, saveView } from "../lib/universal-canvas-engine/viewport-engine";
import { serializeSelection } from "../lib/universal-canvas-engine/selection-engine";
import { recordOperation, listHistory } from "../lib/universal-canvas-engine/history-engine";
import { alignNodes, distributeNodes, addGuide, findOverlapping } from "../lib/universal-canvas-engine/layout-engine";
import { CANVAS_SHORTCUTS, CONTEXT_MENU_ITEMS } from "../lib/universal-canvas-engine/interaction-engine";
import { listRenderers, seedPlatformRenderers } from "../lib/universal-canvas-engine/rendering-engine";
import { buildUCESummary, listSnapshots } from "../lib/universal-canvas-engine/uce-orchestrator";
import { canvasRegistry, canvasLayers, canvasDiagnostics, canvasPreferences } from "@workspace/db/schema";
import { db } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";

export const universalCanvasEngineRouter = Router();

// ── POST /canvas/session ──────────────────────────────────────────────────────
universalCanvasEngineRouter.post("/session", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { canvasId, viewportX, viewportY, zoomLevel } = req.body;
  if (!canvasId) return res.status(400).json({ error: "canvasId required" });
  const session = await startSession(canvasId, userId, { x: viewportX ?? 0, y: viewportY ?? 0, zoom: zoomLevel ?? 100 });
  // Update registry last session timestamp
  await db.update(canvasRegistry).set({ lastSessionAt: new Date(), updatedAt: new Date() })
    .where(eq(canvasRegistry.canvasId, canvasId));
  return res.status(201).json(session);
}) as RequestHandler);

// ── POST /canvas/selection ────────────────────────────────────────────────────
universalCanvasEngineRouter.post("/selection", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { selectedIds, anchorId, mode } = req.body;
  const state = { selectedIds: selectedIds ?? [], anchorId: anchorId ?? null, mode: mode ?? "replace" };
  return res.status(200).json(serializeSelection(state));
}) as RequestHandler);

// ── POST /canvas/history ──────────────────────────────────────────────────────
universalCanvasEngineRouter.post("/history", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { canvasId, sessionId, operationType, operationTitle, affectedNodeIds, beforeState, afterState, sequenceNumber } = req.body;
  if (!canvasId || !operationType || !operationTitle) {
    return res.status(400).json({ error: "canvasId, operationType, operationTitle required" });
  }
  const entry = await recordOperation({
    canvasId, sessionId, operationType, operationTitle,
    affectedNodeIds: affectedNodeIds ?? [],
    beforeState:     beforeState ?? {},
    afterState:      afterState ?? {},
    sequenceNumber:  sequenceNumber ?? 0,
  });
  await db.update(canvasRegistry).set({ lastEditedAt: new Date(), updatedAt: new Date() })
    .where(eq(canvasRegistry.canvasId, canvasId));
  return res.status(201).json(entry);
}) as RequestHandler);

// ── POST /canvas/layout ───────────────────────────────────────────────────────
universalCanvasEngineRouter.post("/layout", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { operation, nodes, target } = req.body;
  if (!operation || !nodes) return res.status(400).json({ error: "operation and nodes required" });
  let result: unknown;
  switch (operation) {
    case "align":      result = alignNodes(nodes, target);           break;
    case "distribute": result = distributeNodes(nodes, target);      break;
    case "overlapping":result = findOverlapping(nodes);              break;
    default: return res.status(400).json({ error: `Unknown layout operation: ${operation}` });
  }
  return res.status(200).json({ operation, nodes: result });
}) as RequestHandler);

// ── GET /canvas ───────────────────────────────────────────────────────────────
universalCanvasEngineRouter.get("/", (async (req, res) => {
  const canvases = await db.select().from(canvasRegistry)
    .where(req.query.mode ? eq(canvasRegistry.canvasMode, req.query.mode as string) : undefined!);
  res.json({ canvases, total: canvases.length });
}) as RequestHandler);

// ── GET /canvas/views ─────────────────────────────────────────────────────────
universalCanvasEngineRouter.get("/views", (async (req, res) => {
  const canvasId = req.query.canvasId as string | undefined;
  if (!canvasId) return res.status(400).json({ error: "canvasId query param required" });
  const views = await listViews(canvasId);
  return res.json({ views, total: views.length });
}) as RequestHandler);

// ── GET /canvas/layers ────────────────────────────────────────────────────────
universalCanvasEngineRouter.get("/layers", (async (req, res) => {
  const canvasId = req.query.canvasId as string | undefined;
  if (!canvasId) return res.status(400).json({ error: "canvasId query param required" });
  const layers = await db.select().from(canvasLayers).where(eq(canvasLayers.canvasId, canvasId));
  return res.json({ layers, total: layers.length });
}) as RequestHandler);

// ── GET /canvas/registry ──────────────────────────────────────────────────────
universalCanvasEngineRouter.get("/registry", (async (_req, res) => {
  const summary = await buildUCESummary();
  const registry = await db.select().from(canvasRegistry);
  res.json({ ...summary, registry });
}) as RequestHandler);

// ── GET /canvas/history ───────────────────────────────────────────────────────
universalCanvasEngineRouter.get("/history", (async (req, res) => {
  const canvasId = req.query.canvasId as string | undefined;
  if (!canvasId) return res.status(400).json({ error: "canvasId query param required" });
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
  const history = await listHistory(canvasId, limit);
  return res.json({ history, total: history.length });
}) as RequestHandler);

// ── GET /canvas/preferences ───────────────────────────────────────────────────
universalCanvasEngineRouter.get("/preferences", (async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const prefs = await db.select().from(canvasPreferences)
    .where(eq(canvasPreferences.userId, userId));
  const shortcuts = CANVAS_SHORTCUTS;
  const contextMenu = CONTEXT_MENU_ITEMS;
  return res.json({ preferences: prefs[0] ?? null, shortcuts, contextMenu });
}) as RequestHandler);

// ── GET /canvas/renderers ─────────────────────────────────────────────────────
universalCanvasEngineRouter.get("/renderers", (async (req, res) => {
  const mode = req.query.mode as string | undefined;
  const renderers = await listRenderers(mode as any);
  res.json({ renderers, total: renderers.length });
}) as RequestHandler);

// ── GET /canvas/diagnostics ───────────────────────────────────────────────────
universalCanvasEngineRouter.get("/diagnostics", (async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
  const diags = await db.select().from(canvasDiagnostics)
    .orderBy(canvasDiagnostics.createdAt)
    .limit(limit);
  res.json({ diagnostics: diags, total: diags.length });
}) as RequestHandler);

// ── GET /canvas/search ────────────────────────────────────────────────────────
universalCanvasEngineRouter.get("/search", (async (req, res) => {
  const q = (req.query.q as string) ?? "";
  if (!q.trim()) return res.status(400).json({ error: "query parameter 'q' required" });
  const results = await db.select().from(canvasRegistry)
    .where(or(ilike(canvasRegistry.title, `%${q}%`), ilike(canvasRegistry.canvasMode, `%${q}%`)));
  return res.json({ results, total: results.length });
}) as RequestHandler);
