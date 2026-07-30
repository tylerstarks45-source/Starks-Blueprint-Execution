// ─── Business Graph Routes (Build 015) ───────────────────────────────────────
//
// REST API for the Business Graph Engine.
// All routes require authentication.
// Business Graph contains business reality. Executive Cognition reasons over it.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  getBusiness, listUserBusinesses,
  saveNode, updateNode, getNode, listNodes,
  saveEdge, listEdges,
  saveKpi, updateKpi, listKpis, getKpiHistory,
  getLatestHealth, listDependencies, listSnapshots,
  getRegistryEntry, listRegistryEntries,
  getBusinessGraphSummary, getBusinessGraphDiagnostics,
} from "../lib/business-graph/business-registry";
import {
  computeAndSaveHealth, runAndSaveDependencyScan,
  createGraphSnapshot, refreshBusinessGraph,
} from "../lib/business-graph/business-orchestrator";
import { buildNodeSpec } from "../lib/business-graph/node-engine";
import { buildEdgeSpec, suggestEdgeTypes } from "../lib/business-graph/relationship-engine";
import { buildKpiSpec, computeTrend } from "../lib/business-graph/kpi-engine";
import { assembleBizGraphSummary } from "../lib/business-graph/business-context";
import { logger } from "../lib/logger";

const router = Router();

// ── GET /api/business-graph/businesses ────────────────────────────────────────

router.get("/businesses", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businesses = await listUserBusinesses(userId);
    const entries = await listRegistryEntries(userId);
    const registryMap = new Map(entries.map((e) => [e.businessId, e]));
    res.json({
      businesses: businesses.map((b) => ({
        ...b,
        registry: registryMap.get(b.id) ?? null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to list businesses" });
  }
});

// ── GET /api/business-graph/businesses/:id ────────────────────────────────────

router.get("/businesses/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const business = await getBusiness(businessId);
    if (!business || business.ownerId !== userId) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const registry = await getRegistryEntry(businessId);
    res.json({ business, registry });
  } catch (err) {
    res.status(500).json({ error: "Failed to get business" });
  }
});

// ── POST /api/business-graph/businesses/:id/refresh ──────────────────────────

router.post("/businesses/:id/refresh", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const business = await getBusiness(businessId);
    if (!business || business.ownerId !== userId) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    await refreshBusinessGraph(businessId, userId);
    const [health, registry] = await Promise.all([getLatestHealth(businessId), getRegistryEntry(businessId)]);
    res.json({ health, registry });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Refresh failed" });
  }
});

// ── GET /api/business-graph/businesses/:id/graph ─────────────────────────────

router.get("/businesses/:id/graph", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const [business, nodes, edges, kpis, health, deps] = await Promise.all([
      getBusiness(businessId), listNodes(businessId), listEdges(businessId),
      listKpis(businessId), getLatestHealth(businessId), listDependencies(businessId),
    ]);
    if (!business || business.ownerId !== userId) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    res.json({ business, nodes, edges, kpis, health, deps });
  } catch (err) {
    res.status(500).json({ error: "Failed to get graph" });
  }
});

// ── GET /api/business-graph/businesses/:id/summary ───────────────────────────

router.get("/businesses/:id/summary", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const data = await getBusinessGraphSummary(businessId, userId);
    if (!data) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const summary = assembleBizGraphSummary(data);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// ── GET /api/business-graph/businesses/:id/nodes ─────────────────────────────

router.get("/businesses/:id/nodes", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const nodes = await listNodes(businessId);
    res.json({ nodes });
  } catch (err) {
    res.status(500).json({ error: "Failed to list nodes" });
  }
});

// ── POST /api/business-graph/businesses/:id/nodes ────────────────────────────

router.post("/businesses/:id/nodes", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const business = await getBusiness(businessId);
    if (!business || business.ownerId !== userId) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const { nodeType, name, description, ownerName, priority, risk, confidence, businessValue, strategicImportance, tags, metadata } = req.body;
    if (!nodeType || !name) {
      res.status(400).json({ error: "nodeType and name are required" });
      return;
    }
    const spec = buildNodeSpec({ businessId, userId, nodeType, name, description, ownerName, priority, risk, confidence, businessValue, strategicImportance, tags, metadata });
    const node = await saveNode(spec);
    res.status(201).json({ node });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create node" });
  }
});

// ── GET /api/business-graph/nodes/:id ────────────────────────────────────────

router.get("/nodes/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const node = await getNode(req.params.id!);
    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }
    res.json({ node });
  } catch (err) {
    res.status(500).json({ error: "Failed to get node" });
  }
});

// ── PATCH /api/business-graph/nodes/:id ──────────────────────────────────────

router.patch("/nodes/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const node = await getNode(req.params.id!);
    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }
    const updated = { ...node, ...req.body, id: node.id, businessId: node.businessId, userId: node.userId };
    await updateNode(updated);
    res.json({ node: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to update node" });
  }
});

// ── GET /api/business-graph/businesses/:id/edges ─────────────────────────────

router.get("/businesses/:id/edges", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const edges = await listEdges(parseInt(req.params.id!));
    res.json({ edges });
  } catch (err) {
    res.status(500).json({ error: "Failed to list edges" });
  }
});

// ── POST /api/business-graph/businesses/:id/edges ────────────────────────────

router.post("/businesses/:id/edges", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const { fromNodeId, toNodeId, edgeType, label, weight, metadata } = req.body;
    if (!fromNodeId || !toNodeId || !edgeType) {
      res.status(400).json({ error: "fromNodeId, toNodeId, and edgeType are required" });
      return;
    }
    const spec = buildEdgeSpec({ businessId, userId, fromNodeId, toNodeId, edgeType, label, weight, metadata });
    const edge = await saveEdge(spec);
    res.status(201).json({ edge });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create edge" });
  }
});

// ── GET /api/business-graph/businesses/:id/kpis ──────────────────────────────

router.get("/businesses/:id/kpis", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const kpis = await listKpis(parseInt(req.params.id!));
    res.json({ kpis });
  } catch (err) {
    res.status(500).json({ error: "Failed to list KPIs" });
  }
});

// ── POST /api/business-graph/businesses/:id/kpis ─────────────────────────────

router.post("/businesses/:id/kpis", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const { nodeId, name, kpiType, currentValue, targetValue, unit, period, metadata } = req.body;
    if (!name || !kpiType) {
      res.status(400).json({ error: "name and kpiType are required" });
      return;
    }
    const spec = buildKpiSpec({ businessId, userId, nodeId, name, kpiType, currentValue, targetValue, unit, period, metadata });
    const kpi = await saveKpi(spec);
    res.status(201).json({ kpi });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create KPI" });
  }
});

// ── POST /api/business-graph/kpis/:id/record ─────────────────────────────────

router.post("/kpis/:id/record", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { value } = req.body;
    if (value == null) {
      res.status(400).json({ error: "value is required" });
      return;
    }
    const allKpis = await import("../lib/business-graph/business-registry").then((m) => m.listKpis);
    // Get kpi via getNode-equivalent
    const rows = await import("@workspace/db").then(async ({ db }) => {
      const { businessKpisTable } = await import("@workspace/db/schema");
      const { eq } = await import("drizzle-orm");
      return db.select().from(businessKpisTable).where(eq(businessKpisTable.id, req.params.id!)).limit(1);
    });
    if (!rows[0]) {
      res.status(404).json({ error: "KPI not found" });
      return;
    }
    const r = rows[0] as any;
    const trend = computeTrend(value, r.current_value ?? r.currentValue);
    await updateKpi({ ...r, id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id, nodeId: r.nodeId ?? r.node_id, name: r.name, kpiType: r.kpiType ?? r.kpi_type, previousValue: r.currentValue ?? r.current_value, currentValue: value, trend, isHealthy: true, unit: r.unit, period: r.period, metadata: r.metadata ?? {}, measuredAt: new Date(), createdAt: new Date(r.createdAt ?? r.created_at), updatedAt: new Date() });
    res.json({ recorded: true, trend });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to record KPI" });
  }
});

// ── GET /api/business-graph/kpis/:id/history ─────────────────────────────────

router.get("/kpis/:id/history", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const history = await getKpiHistory(req.params.id!, parseInt((req.query.limit as string) ?? "30"));
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: "Failed to get KPI history" });
  }
});

// ── GET /api/business-graph/businesses/:id/health ────────────────────────────

router.get("/businesses/:id/health", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const health = await getLatestHealth(businessId);
    res.json({ health });
  } catch (err) {
    res.status(500).json({ error: "Failed to get health" });
  }
});

// ── POST /api/business-graph/businesses/:id/health/compute ───────────────────

router.post("/businesses/:id/health/compute", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const health = await computeAndSaveHealth(parseInt(req.params.id!), userId);
    res.json({ health });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Health computation failed" });
  }
});

// ── GET /api/business-graph/businesses/:id/dependencies ──────────────────────

router.get("/businesses/:id/dependencies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const deps = await listDependencies(parseInt(req.params.id!));
    res.json({ deps });
  } catch (err) {
    res.status(500).json({ error: "Failed to list dependencies" });
  }
});

// ── POST /api/business-graph/businesses/:id/dependencies/scan ────────────────

router.post("/businesses/:id/dependencies/scan", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const saved = await runAndSaveDependencyScan(parseInt(req.params.id!), userId);
    res.json({ detected: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Dependency scan failed" });
  }
});

// ── GET /api/business-graph/businesses/:id/snapshots ─────────────────────────

router.get("/businesses/:id/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const snapshots = await listSnapshots(parseInt(req.params.id!));
    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

// ── POST /api/business-graph/businesses/:id/snapshots ────────────────────────

router.post("/businesses/:id/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { reason } = req.body as { reason?: string };
    const snapshotId = await createGraphSnapshot(parseInt(req.params.id!), userId, reason);
    res.status(201).json({ snapshotId });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Snapshot creation failed" });
  }
});

// ── GET /api/business-graph/diagnostics ──────────────────────────────────────

router.get("/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const diagnostics = await getBusinessGraphDiagnostics(userId);
    res.json({ diagnostics });
  } catch (err) {
    res.status(500).json({ error: "Failed to get diagnostics" });
  }
});

// ── GET /api/business-graph/node-types ───────────────────────────────────────

router.get("/node-types", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { ALL_NODE_TYPES } = await import("../lib/business-graph/types");
  res.json({ nodeTypes: ALL_NODE_TYPES });
});

// ── GET /api/business-graph/edge-types ───────────────────────────────────────

router.get("/edge-types", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { ALL_EDGE_TYPES } = await import("../lib/business-graph/types");
  res.json({ edgeTypes: ALL_EDGE_TYPES });
});

export default router;
