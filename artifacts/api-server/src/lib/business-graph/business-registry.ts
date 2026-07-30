// ─── Build 015: Business Graph Registry ──────────────────────────────────────
//
// All DB persistence for the Business Graph Engine.
// Builds on the existing `businesses` table (serial integer PK).

import { db } from "@workspace/db";
import {
  businessesTable,
  businessNodesTable,
  businessEdgesTable,
  businessKpisTable,
  businessMetricsTable,
  businessHealthTable,
  businessDependenciesTable,
  businessSnapshotsTable,
  businessRegistryTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  BusinessDependency,
  BusinessEdge,
  BusinessGraphDiagnostics,
  BusinessGraphSummary,
  BusinessHealth,
  BusinessKpi,
  BusinessNode,
  BusinessRegistryEntry,
  BusinessSnapshot,
} from "./types";
import { logger } from "../logger";

// ── ID generators ─────────────────────────────────────────────────────────────

const uid = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapNode(r: any): BusinessNode {
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    nodeType: r.nodeType ?? r.node_type, name: r.name, description: r.description ?? "",
    lifecycle: r.lifecycle, health: r.health, status: r.status,
    ownerName: r.ownerName ?? r.owner_name,
    priority: r.priority, risk: r.risk,
    confidence: r.confidence, businessValue: r.businessValue ?? r.business_value,
    strategicImportance: r.strategicImportance ?? r.strategic_importance,
    isActive: r.isActive ?? r.is_active, tags: (r.tags ?? []) as string[],
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(r.createdAt ?? r.created_at), updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

function mapEdge(r: any): BusinessEdge {
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    fromNodeId: r.fromNodeId ?? r.from_node_id, toNodeId: r.toNodeId ?? r.to_node_id,
    edgeType: r.edgeType ?? r.edge_type, label: r.label, weight: r.weight,
    version: r.version, isActive: r.isActive ?? r.is_active,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(r.createdAt ?? r.created_at), updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

function mapKpi(r: any): BusinessKpi {
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    nodeId: r.nodeId ?? r.node_id, name: r.name, kpiType: r.kpiType ?? r.kpi_type,
    currentValue: r.currentValue ?? r.current_value, targetValue: r.targetValue ?? r.target_value,
    previousValue: r.previousValue ?? r.previous_value, unit: r.unit,
    trend: r.trend, period: r.period, isHealthy: r.isHealthy ?? r.is_healthy,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    measuredAt: r.measuredAt ?? r.measured_at ? new Date(r.measuredAt ?? r.measured_at) : null,
    createdAt: new Date(r.createdAt ?? r.created_at), updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

function mapHealth(r: any): BusinessHealth {
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    overallHealth: r.overallHealth ?? r.overall_health,
    financialHealth: r.financialHealth ?? r.financial_health,
    marketingHealth: r.marketingHealth ?? r.marketing_health,
    salesHealth: r.salesHealth ?? r.sales_health,
    operationalHealth: r.operationalHealth ?? r.operational_health,
    productHealth: r.productHealth ?? r.product_health,
    growthHealth: r.growthHealth ?? r.growth_health,
    executiveHealth: r.executiveHealth ?? r.executive_health,
    issues: (r.issues ?? []) as any[],
    recommendations: (r.recommendations ?? []) as string[],
    nodeCount: r.nodeCount ?? r.node_count,
    kpiCount: r.kpiCount ?? r.kpi_count,
    dependencyCount: r.dependencyCount ?? r.dependency_count,
    criticalDependencies: r.criticalDependencies ?? r.critical_dependencies,
    computedAt: new Date(r.computedAt ?? r.computed_at),
  };
}

function mapDep(r: any): BusinessDependency {
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    fromNodeId: r.fromNodeId ?? r.from_node_id, toNodeId: r.toNodeId ?? r.to_node_id,
    dependencyType: r.dependencyType ?? r.dependency_type, severity: r.severity,
    description: r.description, resolved: r.resolved,
    resolvedAt: r.resolvedAt ?? r.resolved_at ? new Date(r.resolvedAt ?? r.resolved_at) : null,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    detectedAt: new Date(r.detectedAt ?? r.detected_at),
  };
}

function mapSnapshot(r: any): BusinessSnapshot {
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    nodeCount: r.nodeCount ?? r.node_count, edgeCount: r.edgeCount ?? r.edge_count,
    kpiCount: r.kpiCount ?? r.kpi_count, healthScore: r.healthScore ?? r.health_score,
    reason: r.reason, graphState: (r.graphState ?? r.graph_state ?? {}) as Record<string, unknown>,
    createdAt: new Date(r.createdAt ?? r.created_at),
  };
}

// ── Node CRUD ─────────────────────────────────────────────────────────────────

export async function saveNode(n: Omit<BusinessNode, "id" | "createdAt" | "updatedAt">): Promise<BusinessNode> {
  const id = uid("bn"); const now = new Date();
  await db.insert(businessNodesTable).values({
    id, businessId: n.businessId, userId: n.userId, nodeType: n.nodeType,
    name: n.name, description: n.description, lifecycle: n.lifecycle, health: n.health,
    status: n.status, ownerName: n.ownerName ?? undefined, priority: n.priority, risk: n.risk,
    confidence: n.confidence, businessValue: n.businessValue, strategicImportance: n.strategicImportance,
    isActive: n.isActive, tags: n.tags as any, metadata: n.metadata as any,
    createdAt: now, updatedAt: now,
  });
  return { ...n, id, createdAt: now, updatedAt: now };
}

export async function updateNode(n: BusinessNode): Promise<void> {
  await db.update(businessNodesTable).set({
    name: n.name, description: n.description, lifecycle: n.lifecycle, health: n.health,
    status: n.status, ownerName: n.ownerName ?? undefined, priority: n.priority, risk: n.risk,
    confidence: n.confidence, businessValue: n.businessValue, strategicImportance: n.strategicImportance,
    isActive: n.isActive, tags: n.tags as any, metadata: n.metadata as any, updatedAt: new Date(),
  }).where(eq(businessNodesTable.id, n.id));
}

export async function getNode(id: string): Promise<BusinessNode | null> {
  const rows = await db.select().from(businessNodesTable).where(eq(businessNodesTable.id, id)).limit(1);
  return rows[0] ? mapNode(rows[0]) : null;
}

export async function listNodes(businessId: number, activeOnly = true): Promise<BusinessNode[]> {
  const conds = [eq(businessNodesTable.businessId, businessId)];
  if (activeOnly) conds.push(eq(businessNodesTable.isActive, true));
  const rows = await db.select().from(businessNodesTable).where(and(...conds)).orderBy(asc(businessNodesTable.priority), desc(businessNodesTable.createdAt));
  return rows.map(mapNode);
}

// ── Edge CRUD ─────────────────────────────────────────────────────────────────

export async function saveEdge(e: Omit<BusinessEdge, "id" | "createdAt" | "updatedAt">): Promise<BusinessEdge> {
  const id = uid("be"); const now = new Date();
  await db.insert(businessEdgesTable).values({
    id, businessId: e.businessId, userId: e.userId, fromNodeId: e.fromNodeId, toNodeId: e.toNodeId,
    edgeType: e.edgeType, label: e.label ?? undefined, weight: e.weight, version: e.version,
    isActive: e.isActive, metadata: e.metadata as any, createdAt: now, updatedAt: now,
  });
  return { ...e, id, createdAt: now, updatedAt: now };
}

export async function listEdges(businessId: number, activeOnly = true): Promise<BusinessEdge[]> {
  const conds = [eq(businessEdgesTable.businessId, businessId)];
  if (activeOnly) conds.push(eq(businessEdgesTable.isActive, true));
  const rows = await db.select().from(businessEdgesTable).where(and(...conds));
  return rows.map(mapEdge);
}

// ── KPI CRUD ──────────────────────────────────────────────────────────────────

export async function saveKpi(k: Omit<BusinessKpi, "id" | "createdAt" | "updatedAt">): Promise<BusinessKpi> {
  const id = uid("bk"); const now = new Date();
  await db.insert(businessKpisTable).values({
    id, businessId: k.businessId, userId: k.userId, nodeId: k.nodeId ?? undefined,
    name: k.name, kpiType: k.kpiType, currentValue: k.currentValue ?? undefined,
    targetValue: k.targetValue ?? undefined, previousValue: k.previousValue ?? undefined,
    unit: k.unit, trend: k.trend, period: k.period, isHealthy: k.isHealthy,
    metadata: k.metadata as any, measuredAt: k.measuredAt ?? undefined, createdAt: now, updatedAt: now,
  });
  return { ...k, id, createdAt: now, updatedAt: now };
}

export async function updateKpi(k: BusinessKpi): Promise<void> {
  await db.insert(businessMetricsTable).values({
    id: uid("bm"), kpiId: k.id, businessId: k.businessId, userId: k.userId,
    value: k.currentValue ?? 0, label: k.name, period: k.period, recordedAt: new Date(),
  }).onConflictDoNothing();
  await db.update(businessKpisTable).set({
    currentValue: k.currentValue ?? undefined, targetValue: k.targetValue ?? undefined,
    previousValue: k.previousValue ?? undefined, trend: k.trend, isHealthy: k.isHealthy,
    metadata: k.metadata as any, measuredAt: k.measuredAt ?? undefined, updatedAt: new Date(),
  }).where(eq(businessKpisTable.id, k.id));
}

export async function listKpis(businessId: number): Promise<BusinessKpi[]> {
  const rows = await db.select().from(businessKpisTable).where(eq(businessKpisTable.businessId, businessId)).orderBy(asc(businessKpisTable.kpiType));
  return rows.map(mapKpi);
}

export async function getKpiHistory(kpiId: string, limit = 30): Promise<any[]> {
  return db.select().from(businessMetricsTable).where(eq(businessMetricsTable.kpiId, kpiId)).orderBy(desc(businessMetricsTable.recordedAt)).limit(limit);
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function saveHealth(h: Omit<BusinessHealth, "id" | "computedAt">): Promise<BusinessHealth> {
  const id = uid("bh"); const now = new Date();
  await db.insert(businessHealthTable).values({
    id, businessId: h.businessId, userId: h.userId,
    overallHealth: h.overallHealth, financialHealth: h.financialHealth,
    marketingHealth: h.marketingHealth, salesHealth: h.salesHealth,
    operationalHealth: h.operationalHealth, productHealth: h.productHealth,
    growthHealth: h.growthHealth, executiveHealth: h.executiveHealth,
    issues: h.issues as any, recommendations: h.recommendations as any,
    nodeCount: h.nodeCount, kpiCount: h.kpiCount, dependencyCount: h.dependencyCount,
    criticalDependencies: h.criticalDependencies, computedAt: now,
  });
  return { ...h, id, computedAt: now };
}

export async function getLatestHealth(businessId: number): Promise<BusinessHealth | null> {
  const rows = await db.select().from(businessHealthTable).where(eq(businessHealthTable.businessId, businessId)).orderBy(desc(businessHealthTable.computedAt)).limit(1);
  return rows[0] ? mapHealth(rows[0]) : null;
}

// ── Dependencies ──────────────────────────────────────────────────────────────

export async function saveDependency(d: BusinessDependency): Promise<void> {
  await db.insert(businessDependenciesTable).values({
    id: d.id, businessId: d.businessId, userId: d.userId,
    fromNodeId: d.fromNodeId ?? undefined, toNodeId: d.toNodeId ?? undefined,
    dependencyType: d.dependencyType, severity: d.severity, description: d.description,
    resolved: d.resolved, resolvedAt: d.resolvedAt ?? undefined,
    metadata: d.metadata as any, detectedAt: d.detectedAt,
  }).onConflictDoNothing();
}

export async function listDependencies(businessId: number, resolvedOnly = false): Promise<BusinessDependency[]> {
  const rows = await db.select().from(businessDependenciesTable)
    .where(and(eq(businessDependenciesTable.businessId, businessId), eq(businessDependenciesTable.resolved, resolvedOnly)))
    .orderBy(desc(businessDependenciesTable.detectedAt));
  return rows.map(mapDep);
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export async function saveSnapshot(s: Omit<BusinessSnapshot, "id" | "createdAt">): Promise<BusinessSnapshot> {
  const id = uid("bsnap"); const now = new Date();
  await db.insert(businessSnapshotsTable).values({
    id, businessId: s.businessId, userId: s.userId, nodeCount: s.nodeCount,
    edgeCount: s.edgeCount, kpiCount: s.kpiCount, healthScore: s.healthScore ?? undefined,
    reason: s.reason, graphState: s.graphState as any, createdAt: now,
  });
  return { ...s, id, createdAt: now };
}

export async function listSnapshots(businessId: number, limit = 10): Promise<BusinessSnapshot[]> {
  const rows = await db.select().from(businessSnapshotsTable)
    .where(eq(businessSnapshotsTable.businessId, businessId))
    .orderBy(desc(businessSnapshotsTable.createdAt)).limit(limit);
  return rows.map(mapSnapshot);
}

// ── Registry ──────────────────────────────────────────────────────────────────

export async function upsertRegistry(businessId: number, userId: number | null, stats: {
  nodeCount: number; edgeCount: number; kpiCount: number; overallHealth?: number;
}): Promise<void> {
  const existing = await db.select().from(businessRegistryTable)
    .where(eq(businessRegistryTable.businessId, businessId)).limit(1);

  const now = new Date();
  if (existing.length > 0) {
    await db.update(businessRegistryTable).set({
      nodeCount: stats.nodeCount, edgeCount: stats.edgeCount, kpiCount: stats.kpiCount,
      overallHealth: stats.overallHealth ?? undefined, lastActivityAt: now, updatedAt: now,
    }).where(eq(businessRegistryTable.businessId, businessId));
  } else {
    await db.insert(businessRegistryTable).values({
      id: uid("breg"), businessId, userId, nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount, kpiCount: stats.kpiCount,
      overallHealth: stats.overallHealth ?? undefined,
      lastActivityAt: now, registeredAt: now, updatedAt: now,
    });
  }
}

export async function getRegistryEntry(businessId: number): Promise<BusinessRegistryEntry | null> {
  const rows = await db.select().from(businessRegistryTable).where(eq(businessRegistryTable.businessId, businessId)).limit(1);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id, businessId: r.businessId, userId: r.userId,
    nodeCount: r.nodeCount, edgeCount: r.edgeCount, kpiCount: r.kpiCount,
    overallHealth: r.overallHealth ?? null,
    lastActivityAt: r.lastActivityAt ?? null, registeredAt: r.registeredAt, updatedAt: r.updatedAt,
  };
}

export async function listRegistryEntries(userId: number): Promise<BusinessRegistryEntry[]> {
  const rows = await db.select().from(businessRegistryTable)
    .where(eq(businessRegistryTable.userId, userId))
    .orderBy(desc(businessRegistryTable.lastActivityAt));
  return rows.map((r: any) => ({
    id: r.id, businessId: r.businessId, userId: r.userId,
    nodeCount: r.nodeCount, edgeCount: r.edgeCount, kpiCount: r.kpiCount,
    overallHealth: r.overallHealth ?? null,
    lastActivityAt: r.lastActivityAt ?? null, registeredAt: r.registeredAt, updatedAt: r.updatedAt,
  }));
}

// ── Business lookup (existing table) ─────────────────────────────────────────

export async function getBusiness(id: number): Promise<{ id: number; name: string; businessType: string; ownerId: number } | null> {
  const rows = await db.select().from(businessesTable).where(eq(businessesTable.id, id)).limit(1);
  return rows[0] ? { id: rows[0].id, name: rows[0].name, businessType: rows[0].businessType, ownerId: rows[0].ownerId } : null;
}

export async function listUserBusinesses(userId: number): Promise<Array<{ id: number; name: string; businessType: string }>> {
  const rows = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, userId)).orderBy(desc(businessesTable.createdAt)).limit(20);
  return rows.map((r) => ({ id: r.id, name: r.name, businessType: r.businessType }));
}

// ── Business Graph Summary (for EB) ──────────────────────────────────────────

export async function getBusinessGraphSummary(businessId: number, userId: number): Promise<{
  business: { id: number; name: string };
  nodes: BusinessNode[];
  edges: BusinessEdge[];
  kpis: BusinessKpi[];
  health: BusinessHealth | null;
  deps: BusinessDependency[];
  lastActivityAt: Date | null;
} | null> {
  try {
    const [business, nodes, edges, kpis, health, deps, registry] = await Promise.all([
      getBusiness(businessId),
      listNodes(businessId),
      listEdges(businessId),
      listKpis(businessId),
      getLatestHealth(businessId),
      listDependencies(businessId),
      getRegistryEntry(businessId),
    ]);
    if (!business) return null;
    return { business, nodes, edges, kpis, health, deps, lastActivityAt: registry?.lastActivityAt ?? null };
  } catch (err) {
    logger.warn({ err }, "Business Graph: getBusinessGraphSummary failed");
    return null;
  }
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export async function getBusinessGraphDiagnostics(userId: number): Promise<BusinessGraphDiagnostics> {
  const businesses = await listUserBusinesses(userId);
  if (businesses.length === 0) {
    return { userId, registeredBusinesses: 0, totalNodes: 0, totalEdges: 0, totalKpis: 0, totalDependencies: 0, unresolvedDependencies: 0, averageHealth: null, topNodeTypes: {}, topEdgeTypes: {} };
  }

  const bizIds = businesses.map((b) => b.id);
  const [nodeRows, edgeRows, kpiRows, depRows, healthRows] = await Promise.all([
    db.select().from(businessNodesTable).where(inArray(businessNodesTable.businessId, bizIds)),
    db.select().from(businessEdgesTable).where(inArray(businessEdgesTable.businessId, bizIds)),
    db.select({ count: sql<number>`count(*)` }).from(businessKpisTable).where(inArray(businessKpisTable.businessId, bizIds)),
    db.select().from(businessDependenciesTable).where(inArray(businessDependenciesTable.businessId, bizIds)),
    db.select({ overallHealth: businessHealthTable.overallHealth })
      .from(businessHealthTable).where(inArray(businessHealthTable.businessId, bizIds))
      .orderBy(desc(businessHealthTable.computedAt)).limit(bizIds.length),
  ]);

  const nodeTypes: Record<string, number> = {};
  for (const n of nodeRows as any[]) nodeTypes[n.nodeType ?? n.node_type] = (nodeTypes[n.nodeType ?? n.node_type] ?? 0) + 1;
  const edgeTypes: Record<string, number> = {};
  for (const e of edgeRows as any[]) edgeTypes[e.edgeType ?? e.edge_type] = (edgeTypes[e.edgeType ?? e.edge_type] ?? 0) + 1;

  const healthScores = healthRows.map((h) => h.overallHealth).filter((s) => s != null) as number[];
  const avgHealth = healthScores.length > 0 ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length : null;

  return {
    userId, registeredBusinesses: businesses.length,
    totalNodes: nodeRows.length, totalEdges: edgeRows.length,
    totalKpis: Number(kpiRows[0]?.count ?? 0),
    totalDependencies: depRows.length,
    unresolvedDependencies: depRows.filter((d: any) => !(d.resolved)).length,
    averageHealth: avgHealth ? parseFloat(avgHealth.toFixed(3)) : null,
    topNodeTypes: nodeTypes, topEdgeTypes: edgeTypes,
  };
}
