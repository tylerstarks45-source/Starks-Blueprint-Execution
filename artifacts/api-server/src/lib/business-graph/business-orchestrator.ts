// ─── Build 015: Business Graph Orchestrator ───────────────────────────────────
//
// Orchestrates graph operations: compute health, run dependency scan, create snapshots.

import { computeBusinessHealth } from "./health-engine";
import { runDependencyScan } from "./dependency-engine";
import { assembleBizGraphSummary } from "./business-context";
import {
  listNodes, listEdges, listKpis, listDependencies, getLatestHealth,
  saveHealth, saveDependency, saveSnapshot, upsertRegistry, getRegistryEntry, getBusiness,
} from "./business-registry";
import type { BusinessGraphSummary, BusinessHealth } from "./types";
import { logger } from "../logger";

// ── Compute and persist health ────────────────────────────────────────────────

export async function computeAndSaveHealth(businessId: number, userId: number | null): Promise<BusinessHealth | null> {
  try {
    const [nodes, edges, kpis, deps] = await Promise.all([
      listNodes(businessId),
      listEdges(businessId),
      listKpis(businessId),
      listDependencies(businessId),
    ]);
    const spec = computeBusinessHealth({ businessId, userId, nodes, edges, kpis, deps });
    return await saveHealth(spec);
  } catch (err) {
    logger.warn({ err }, "Business Graph: computeAndSaveHealth failed");
    return null;
  }
}

// ── Run dependency scan and persist new deps ──────────────────────────────────

export async function runAndSaveDependencyScan(businessId: number, userId: number | null): Promise<number> {
  try {
    const [nodes, edges] = await Promise.all([listNodes(businessId), listEdges(businessId)]);
    const deps = runDependencyScan(nodes, edges);
    let saved = 0;
    for (const d of deps) {
      try { await saveDependency({ ...d, businessId, userId }); saved++; } catch { /* duplicate */ }
    }
    return saved;
  } catch (err) {
    logger.warn({ err }, "Business Graph: runAndSaveDependencyScan failed");
    return 0;
  }
}

// ── Create a graph snapshot ───────────────────────────────────────────────────

export async function createGraphSnapshot(businessId: number, userId: number | null, reason = "periodic"): Promise<string | null> {
  try {
    const [nodes, edges, kpis, health] = await Promise.all([
      listNodes(businessId), listEdges(businessId), listKpis(businessId), getLatestHealth(businessId),
    ]);
    const snap = await saveSnapshot({
      businessId, userId,
      nodeCount: nodes.length, edgeCount: edges.length, kpiCount: kpis.length,
      healthScore: health?.overallHealth ?? null,
      reason,
      graphState: {
        nodeTypes: nodes.reduce((acc: Record<string, number>, n) => { acc[n.nodeType] = (acc[n.nodeType] ?? 0) + 1; return acc; }, {}),
        edgeTypes: edges.reduce((acc: Record<string, number>, e) => { acc[e.edgeType] = (acc[e.edgeType] ?? 0) + 1; return acc; }, {}),
        kpiTypes: kpis.map((k) => k.kpiType),
      },
    });
    return snap.id;
  } catch (err) {
    logger.warn({ err }, "Business Graph: createGraphSnapshot failed");
    return null;
  }
}

// ── Full graph refresh (health + deps + registry + snapshot) ─────────────────

export async function refreshBusinessGraph(businessId: number, userId: number): Promise<void> {
  try {
    await Promise.all([
      computeAndSaveHealth(businessId, userId),
      runAndSaveDependencyScan(businessId, userId),
    ]);
    const [nodes, edges, kpis, health] = await Promise.all([
      listNodes(businessId), listEdges(businessId), listKpis(businessId), getLatestHealth(businessId),
    ]);
    await upsertRegistry(businessId, userId, {
      nodeCount: nodes.length, edgeCount: edges.length,
      kpiCount: kpis.length, overallHealth: health?.overallHealth ?? undefined,
    });
    logger.info({ businessId, userId, nodeCount: nodes.length, edgeCount: edges.length }, "Business Graph: refreshed");
  } catch (err) {
    logger.warn({ err }, "Business Graph: refreshBusinessGraph failed");
  }
}

// ── Get the full graph summary for EB ─────────────────────────────────────────

export async function getGraphSummaryForEB(userId: number): Promise<BusinessGraphSummary | null> {
  try {
    const { db } = await import("@workspace/db");
    const { businessesTable } = await import("@workspace/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    // Find the primary business for this user (most recently updated)
    const bizRows = await db.select().from(businessesTable)
      .where(eq(businessesTable.ownerId, userId))
      .orderBy(desc(businessesTable.updatedAt))
      .limit(1);
    if (!bizRows[0]) return null;

    const biz = bizRows[0];
    const [nodes, edges, kpis, health, deps, registry] = await Promise.all([
      listNodes(biz.id),
      listEdges(biz.id),
      listKpis(biz.id),
      getLatestHealth(biz.id),
      listDependencies(biz.id),
      getRegistryEntry(biz.id),
    ]);
    return assembleBizGraphSummary({
      business: { id: biz.id, name: biz.name },
      nodes, edges, kpis, health, deps,
      lastActivityAt: registry?.lastActivityAt ?? null,
    });
  } catch (err) {
    logger.warn({ err }, "Business Graph: getGraphSummaryForEB failed");
    return null;
  }
}
