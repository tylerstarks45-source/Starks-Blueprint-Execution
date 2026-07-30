// ─── Build 016: Leverage Engine ───────────────────────────────────────────────
//
// Detects 6 types of deterministic leverage points from Business Graph state.
// Leverage is DESCRIPTIVE — it explains what already creates outsized impact.
// Never prescriptive. No graph mutation. Pure.

import { randomUUID } from "crypto";
import type { BusinessDependency, BusinessEdge, BusinessKpi, BusinessNode } from "../business-graph/types";
import type { BusinessLeveragePoint, LeverageType } from "./types";

const uid = () => `blev_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

function makeLeverage(opts: Omit<BusinessLeveragePoint, "id" | "createdAt">): BusinessLeveragePoint {
  return { ...opts, id: uid(), createdAt: new Date() };
}

// ── 1. KPI Multiplier ─────────────────────────────────────────────────────────
// A single KPI is linked to multiple objectives via "measures" edges.

export function detectKpiMultipliers(
  kpis: BusinessKpi[],
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessLeveragePoint[] {
  const results: BusinessLeveragePoint[] = [];
  const measuresEdges = edges.filter((e) => e.isActive && e.edgeType === "measures");
  const objectiveIds = new Set(nodes.filter((n) => n.nodeType === "objective" && n.isActive).map((n) => n.id));

  // Count how many objectives each KPI measures (via node linkage)
  const kpiObjectiveCount = new Map<string, string[]>();
  for (const k of kpis) {
    if (!k.nodeId) continue;
    const measuredObjectives = measuresEdges
      .filter((e) => e.fromNodeId === k.nodeId && objectiveIds.has(e.toNodeId))
      .map((e) => e.toNodeId);
    if (measuredObjectives.length >= 2) kpiObjectiveCount.set(k.id, measuredObjectives);
  }

  for (const [kpiId, objIds] of kpiObjectiveCount) {
    const kpi = kpis.find((k) => k.id === kpiId);
    if (!kpi) continue;
    results.push(makeLeverage({
      businessId, reportId, userId,
      leverageType: "kpi_multiplier",
      title: `KPI "${kpi.name}" drives ${objIds.length} objectives`,
      description: `Improving "${kpi.name}" (${kpi.kpiType}) will simultaneously advance ${objIds.length} business objectives.`,
      leverageScore: Math.min(0.95, 0.5 + objIds.length * 0.15),
      affectedNodeIds: objIds,
      affectedKpiIds: [kpiId],
      evidenceCount: objIds.length,
    }));
  }
  return results.sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 3);
}

// ── 2. Project Multiplier ─────────────────────────────────────────────────────
// A single project is connected to multiple products/services.

export function detectProjectMultipliers(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessLeveragePoint[] {
  const results: BusinessLeveragePoint[] = [];
  const projects = nodes.filter((n) => n.isActive && n.nodeType === "project");
  const productIds = new Set(nodes.filter((n) => n.isActive && ["product", "service"].includes(n.nodeType)).map((n) => n.id));

  for (const project of projects) {
    const connectedProducts = edges.filter(
      (e) => e.isActive && e.fromNodeId === project.id && productIds.has(e.toNodeId),
    );
    if (connectedProducts.length >= 2) {
      results.push(makeLeverage({
        businessId, reportId, userId,
        leverageType: "project_multiplier",
        title: `Project "${project.name}" impacts ${connectedProducts.length} products`,
        description: `Project "${project.name}" contributes to ${connectedProducts.length} products/services — completing it advances multiple revenue areas simultaneously.`,
        leverageScore: Math.min(0.90, 0.50 + connectedProducts.length * 0.12),
        affectedNodeIds: [project.id, ...connectedProducts.map((e) => e.toNodeId)],
        affectedKpiIds: [],
        evidenceCount: connectedProducts.length,
      }));
    }
  }
  return results.sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 3);
}

// ── 3. Automation Remover ─────────────────────────────────────────────────────
// An automation node is linked to multiple bottleneck-prone processes.

export function detectAutomationRemovers(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessLeveragePoint[] {
  const results: BusinessLeveragePoint[] = [];
  const automations = nodes.filter((n) => n.isActive && n.nodeType === "automation");
  const processNodes = nodes.filter((n) => n.isActive && n.nodeType === "process");
  const processIds = new Set(processNodes.map((n) => n.id));

  for (const auto of automations) {
    const coveredProcesses = edges.filter(
      (e) => e.isActive && e.toNodeId === auto.id && processIds.has(e.fromNodeId),
    );
    if (coveredProcesses.length >= 2) {
      results.push(makeLeverage({
        businessId, reportId, userId,
        leverageType: "automation_remover",
        title: `Automation "${auto.name}" covers ${coveredProcesses.length} processes`,
        description: `Automation "${auto.name}" already optimizes ${coveredProcesses.length} processes — expanding it could remove multiple bottlenecks simultaneously.`,
        leverageScore: Math.min(0.85, 0.50 + coveredProcesses.length * 0.10),
        affectedNodeIds: [auto.id, ...coveredProcesses.map((e) => e.fromNodeId)],
        affectedKpiIds: [],
        evidenceCount: coveredProcesses.length,
      }));
    }
  }
  return results.sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 2);
}

// ── 4. Dependency Resolver ────────────────────────────────────────────────────
// Resolving a SPOF dependency would unblock multiple paths.

export function detectDependencyResolvers(
  deps: BusinessDependency[],
  nodes: BusinessNode[],
  reportId: string, businessId: number, userId: number | null,
): BusinessLeveragePoint[] {
  const results: BusinessLeveragePoint[] = [];
  const spofDeps = deps.filter(
    (d) => !d.resolved && d.dependencyType === "single_point_of_failure" && d.toNodeId,
  );

  // Count how many blocked deps reference the same SPOF node
  const spofNodeCount = new Map<string, BusinessDependency[]>();
  for (const d of deps.filter((d2) => !d2.resolved && d2.toNodeId)) {
    const list = spofNodeCount.get(d.toNodeId!) ?? [];
    list.push(d);
    spofNodeCount.set(d.toNodeId!, list);
  }

  for (const spof of spofDeps) {
    const node = nodes.find((n) => n.id === spof.toNodeId);
    if (!node) continue;
    const count = spofNodeCount.get(spof.toNodeId!)?.length ?? 1;
    if (count >= 2) {
      results.push(makeLeverage({
        businessId, reportId, userId,
        leverageType: "dependency_resolver",
        title: `Resolving SPOF "${node.name}" unblocks ${count} paths`,
        description: `Node "${node.name}" (${node.nodeType}) is a single point of failure that ${count} dependencies rely on — resolving it creates a cascading improvement.`,
        leverageScore: Math.min(0.92, 0.60 + count * 0.10),
        affectedNodeIds: [node.id],
        affectedKpiIds: [],
        evidenceCount: count,
      }));
    }
  }
  return results.sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 2);
}

// ── 5. Shared Asset ───────────────────────────────────────────────────────────
// Assets shared by many nodes via "uses" or "belongs_to" edges.

export function detectSharedAssets(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessLeveragePoint[] {
  const results: BusinessLeveragePoint[] = [];
  const assetNodes = nodes.filter((n) => n.isActive && ["asset", "knowledge_asset"].includes(n.nodeType));
  const assetIds = new Set(assetNodes.map((n) => n.id));

  const usesCounts = new Map<string, string[]>();
  for (const e of edges.filter((e2) => e2.isActive && ["uses", "belongs_to"].includes(e2.edgeType))) {
    if (!assetIds.has(e.toNodeId)) continue;
    const list = usesCounts.get(e.toNodeId) ?? [];
    list.push(e.fromNodeId);
    usesCounts.set(e.toNodeId, list);
  }

  for (const [assetId, userIds] of usesCounts) {
    if (userIds.length >= 3) {
      const asset = nodes.find((n) => n.id === assetId);
      if (!asset) continue;
      results.push(makeLeverage({
        businessId, reportId, userId,
        leverageType: "shared_asset",
        title: `Asset "${asset.name}" is used by ${userIds.length} nodes`,
        description: `"${asset.name}" (${asset.nodeType}) is shared across ${userIds.length} nodes — improving it provides outsized returns.`,
        leverageScore: Math.min(0.85, 0.45 + userIds.length * 0.08),
        affectedNodeIds: [assetId, ...userIds],
        affectedKpiIds: [],
        evidenceCount: userIds.length,
      }));
    }
  }
  return results.sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 2);
}

// ── 6. Cross-Functional ───────────────────────────────────────────────────────
// Nodes that bridge multiple departments or teams.

export function detectCrossFunctional(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessLeveragePoint[] {
  const results: BusinessLeveragePoint[] = [];
  const deptNodes = nodes.filter((n) => n.isActive && n.nodeType === "department");
  const deptIds = new Set(deptNodes.map((n) => n.id));

  if (deptNodes.length < 2) return results;

  // Find nodes that are connected to multiple departments
  const crossNodeDepts = new Map<string, Set<string>>();
  for (const e of edges.filter((e2) => e2.isActive)) {
    const bothDept = deptIds.has(e.fromNodeId) || deptIds.has(e.toNodeId);
    if (!bothDept) continue;
    const targetNode = deptIds.has(e.fromNodeId) ? e.toNodeId : e.fromNodeId;
    if (deptIds.has(targetNode)) continue; // dept-to-dept, skip
    const set = crossNodeDepts.get(targetNode) ?? new Set();
    if (deptIds.has(e.fromNodeId)) set.add(e.fromNodeId);
    if (deptIds.has(e.toNodeId)) set.add(e.toNodeId);
    crossNodeDepts.set(targetNode, set);
  }

  for (const [nodeId, linkedDepts] of crossNodeDepts) {
    if (linkedDepts.size >= 2) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      results.push(makeLeverage({
        businessId, reportId, userId,
        leverageType: "cross_functional",
        title: `"${node.name}" bridges ${linkedDepts.size} departments`,
        description: `Node "${node.name}" (${node.nodeType}) connects ${linkedDepts.size} departments — improvements here have cross-functional impact.`,
        leverageScore: Math.min(0.80, 0.50 + linkedDepts.size * 0.12),
        affectedNodeIds: [nodeId, ...linkedDepts],
        affectedKpiIds: [],
        evidenceCount: linkedDepts.size,
      }));
    }
  }
  return results.sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 2);
}

// ── Run all detectors ─────────────────────────────────────────────────────────

export function detectAllLeveragePoints(opts: {
  nodes: BusinessNode[];
  edges: BusinessEdge[];
  kpis: BusinessKpi[];
  deps: BusinessDependency[];
  reportId: string;
  businessId: number;
  userId: number | null;
}): BusinessLeveragePoint[] {
  const { nodes, edges, kpis, deps, reportId, businessId, userId } = opts;
  return [
    ...detectKpiMultipliers(kpis, nodes, edges, reportId, businessId, userId),
    ...detectProjectMultipliers(nodes, edges, reportId, businessId, userId),
    ...detectAutomationRemovers(nodes, edges, reportId, businessId, userId),
    ...detectDependencyResolvers(deps, nodes, reportId, businessId, userId),
    ...detectSharedAssets(nodes, edges, reportId, businessId, userId),
    ...detectCrossFunctional(nodes, edges, reportId, businessId, userId),
  ].sort((a, b) => b.leverageScore - a.leverageScore);
}
