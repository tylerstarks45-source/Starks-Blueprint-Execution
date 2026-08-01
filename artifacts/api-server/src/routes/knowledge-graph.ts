// ── Build 041: Unified Cognitive Knowledge Graph — REST Routes ────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  knowledgeGraphEdges,
  graphEvidence,
  graphConfidence,
  graphRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive, requireAdmin } from "../lib/auth";
import {
  buildUnifiedKnowledgeGraph,
  fetchUnifiedGraphView,
} from "../lib/knowledge-graph/kg-orchestrator";
import { semanticQuery, getNodeById, getEdgeById, getNodeNeighbors } from "../lib/knowledge-graph/kg-traversal-engine";
import { buildExplanationPath } from "../lib/knowledge-graph/kg-explanation-engine";
import { listSnapshots } from "../lib/knowledge-graph/kg-temporal-engine";
import type { GraphPathType } from "../lib/knowledge-graph/types";

export const knowledgeGraphRouter = Router();

// ── POST /graph/rebuild ───────────────────────────────────────────────────
knowledgeGraphRouter.post("/rebuild", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const view = await buildUnifiedKnowledgeGraph(caller.id);
    res.json({ success: true, view });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "rebuild failed" });
  }
});

// ── POST /graph/query ─────────────────────────────────────────────────────
knowledgeGraphRouter.post("/query", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const { domain, nodeType, label, limit } = req.body as {
      domain?: string;
      nodeType?: string;
      label?: string;
      limit?: number;
    };
    const nodes = await semanticQuery({ domain: domain as any, nodeType, label, limit: limit ?? 50 });
    res.json({ success: true, nodes, count: nodes.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "query failed" });
  }
});

// ── GET /graph ────────────────────────────────────────────────────────────
knowledgeGraphRouter.get("/", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const view = await fetchUnifiedGraphView(caller.id);
    if (!view) {
      res.json({ success: true, view: null, message: "Graph not yet initialized. POST /graph/rebuild to build it." });
      return;
    }
    res.json({ success: true, view });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /graph/node/:id ───────────────────────────────────────────────────
knowledgeGraphRouter.get("/node/:id", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const nodeId = parseInt(req.params.id, 10);
    if (isNaN(nodeId)) { res.status(400).json({ error: "invalid node id" }); return; }
    const node = await getNodeById(nodeId);
    if (!node) { res.status(404).json({ error: "node not found" }); return; }
    const neighbors = await getNodeNeighbors(nodeId);
    res.json({ success: true, node, neighbors });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /graph/edge/:id ───────────────────────────────────────────────────
knowledgeGraphRouter.get("/edge/:id", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const edgeId = parseInt(req.params.id, 10);
    if (isNaN(edgeId)) { res.status(400).json({ error: "invalid edge id" }); return; }
    const edge = await getEdgeById(edgeId);
    if (!edge) { res.status(404).json({ error: "edge not found" }); return; }
    res.json({ success: true, edge });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /graph/path ───────────────────────────────────────────────────────
knowledgeGraphRouter.get("/path", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const fromId   = parseInt(String(req.query["fromId"] ?? ""), 10);
    const toId     = parseInt(String(req.query["toId"] ?? ""), 10);
    const pathType = String(req.query["pathType"] ?? "reasoning") as GraphPathType;
    if (isNaN(fromId) || isNaN(toId)) { res.status(400).json({ error: "fromId and toId required" }); return; }
    const path = await buildExplanationPath(fromId, toId, pathType);
    if (!path) { res.status(404).json({ error: "no path found between nodes" }); return; }
    res.json({ success: true, path });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "path failed" });
  }
});

// ── GET /graph/evidence ───────────────────────────────────────────────────
knowledgeGraphRouter.get("/evidence", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const rawNodeId = req.query["nodeId"];
    const nodeId = rawNodeId ? parseInt(String(rawNodeId), 10) : undefined;
    const rows = nodeId
      ? await db.select().from(graphEvidence).where(eq(graphEvidence.nodeId, nodeId)).limit(50)
      : await db.select().from(graphEvidence).orderBy(desc(graphEvidence.createdAt)).limit(50);
    res.json({ success: true, evidence: rows, count: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /graph/confidence ─────────────────────────────────────────────────
knowledgeGraphRouter.get("/confidence", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const rawNodeId = req.query["nodeId"];
    const nodeId = rawNodeId ? parseInt(String(rawNodeId), 10) : undefined;
    const rows = nodeId
      ? await db.select().from(graphConfidence).where(eq(graphConfidence.nodeId, nodeId)).limit(10)
      : await db.select().from(graphConfidence).orderBy(desc(graphConfidence.computedAt)).limit(50);
    res.json({ success: true, confidence: rows, count: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /graph/snapshots ──────────────────────────────────────────────────
knowledgeGraphRouter.get("/snapshots", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const snapshots = await listSnapshots(20);
    res.json({ success: true, snapshots, count: snapshots.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /graph/registry ───────────────────────────────────────────────────
knowledgeGraphRouter.get("/registry", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const registry = await db.select().from(graphRegistry).orderBy(graphRegistry.domain);
    res.json({ success: true, registry, count: registry.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});
