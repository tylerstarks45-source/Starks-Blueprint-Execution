// ── Build 041: Knowledge Graph Orchestrator ───────────────────────────────
// Main entry point: builds the unified knowledge graph from all domain sources.
import { db } from "@workspace/db";
import {
  knowledgeGraphNodes,
  knowledgeGraphEdges,
  graphRegistry,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { resolveNodeIdentity } from "./kg-identity-engine";
import { deduplicateGraph } from "./kg-merge-engine";
import { bulkLinkEvidence, countTotalEvidence } from "./kg-evidence-engine";
import { computeAverageGraphConfidence } from "./kg-confidence-engine";
import { createGraphSnapshot, getLatestSnapshot } from "./kg-temporal-engine";
import { recordNodeCreated } from "./kg-temporal-engine";
import type { UnifiedGraphView, KnowledgeGraphDomain, DomainRegistryEntry } from "./types";
import { KNOWLEDGE_GRAPH_DOMAINS } from "./types";

// ── Domain source loaders ─────────────────────────────────────────────────
// Each loader pulls lightweight reference data from the authoritative source
// and upserts a KG node. No data is duplicated — only identity + reference.

async function syncDomain(
  domain: KnowledgeGraphDomain,
  engineId: string,
  items: Array<{ externalRefType: string; externalRefId: string; label: string; description?: string; metadata?: Record<string, unknown> }>,
): Promise<{ nodeCount: number; edgeCount: number }> {
  let nodeCount = 0;
  const evidenceItems: Array<{ nodeId: number; sourceEngine: string; evidenceType: string; confidence: number }> = [];

  for (const item of items) {
    const { nodeId, isNew } = await resolveNodeIdentity({
      domain,
      nodeType:        "entity_node",
      externalRefType: item.externalRefType,
      externalRefId:   item.externalRefId,
      label:           item.label,
      description:     item.description ?? null,
      sourceEngine:    engineId,
      metadata:        item.metadata ?? {},
    });

    if (isNew) {
      nodeCount++;
      await recordNodeCreated(nodeId, item.label, domain);
      evidenceItems.push({
        nodeId,
        sourceEngine: engineId,
        evidenceType: "domain_registration",
        confidence:   0.8,
      });
    }
  }

  if (evidenceItems.length > 0) {
    await bulkLinkEvidence(evidenceItems);
  }

  // Upsert registry entry
  const existing = await db.select().from(graphRegistry).where(eq(graphRegistry.domain, domain)).limit(1);
  if (existing.length > 0) {
    await db.update(graphRegistry).set({
      nodeCount: (existing[0].nodeCount ?? 0) + nodeCount,
      lastSynced: new Date(),
    }).where(eq(graphRegistry.domain, domain));
  } else {
    await db.insert(graphRegistry).values({
      domain,
      engineId,
      nodeCount,
      edgeCount: 0,
      lastSynced: new Date(),
    });
  }

  return { nodeCount, edgeCount: 0 };
}

// Load business entities from the businesses table
async function loadBusinessDomain(): Promise<void> {
  try {
    const rows = await db.execute(
      "SELECT id, name, industry FROM businesses LIMIT 100" as any,
    ) as any;
    const items = (rows.rows ?? rows ?? []).map((r: any) => ({
      externalRefType: "business",
      externalRefId:   String(r.id),
      label:           r.name ?? "Unnamed Business",
      description:     r.industry ?? null,
    }));
    await syncDomain("business", "business-graph", items);
  } catch {
    await syncDomain("business", "business-graph", []);
  }
}

// Load knowledge entries from the knowledge knowledge_entries table
async function loadKnowledgeDomain(): Promise<void> {
  try {
    const rows = await db.execute(
      "SELECT id, title, topic FROM knowledge_entries LIMIT 100" as any,
    ) as any;
    const items = (rows.rows ?? rows ?? []).map((r: any) => ({
      externalRefType: "knowledge_entry",
      externalRefId:   String(r.id),
      label:           r.title ?? "Knowledge Entry",
      description:     r.topic ?? null,
    }));
    await syncDomain("knowledge", "research-knowledge-engine", items);
  } catch {
    await syncDomain("knowledge", "research-knowledge-engine", []);
  }
}

// Load executive goals
async function loadGoalsDomain(): Promise<void> {
  try {
    const rows = await db.execute(
      "SELECT id, title, status FROM executive_goals LIMIT 100" as any,
    ) as any;
    const items = (rows.rows ?? rows ?? []).map((r: any) => ({
      externalRefType: "executive_goal",
      externalRefId:   String(r.id),
      label:           r.title ?? "Goal",
      description:     r.status ?? null,
    }));
    await syncDomain("goals", "executive-goal-engine", items);
  } catch {
    await syncDomain("goals", "executive-goal-engine", []);
  }
}

// Register all remaining domains with empty sync (future engines will populate)
async function registerRemainingDomains(): Promise<void> {
  const remainingDomains: Array<[KnowledgeGraphDomain, string]> = [
    ["technology",           "global-technology-engine"],
    ["infrastructure",       "platform-infrastructure-engine"],
    ["capability",           "capability-planning-engine"],
    ["execution",            "execution-orchestration-engine"],
    ["planning",             "strategic-planning-engine"],
    ["memory",               "cognitive-memory-architecture"],
    ["observation",          "executive-observation-engine"],
    ["reflection",           "executive-reflection-engine"],
    ["learning",             "executive-learning-engine"],
    ["governance",           "executive-governance-engine"],
    ["strategy",             "executive-strategy-engine"],
    ["portfolio",            "executive-portfolio-engine"],
    ["priority",             "executive-priority-engine"],
    ["tradeoffs",            "executive-tradeoff-engine"],
    ["systems",              "systems-dynamics-engine"],
    ["relationships",        "technology-relationship-engine"],
    ["technology_evolution", "technology-evolution-engine"],
    ["opportunities",        "opportunity-discovery-engine"],
    ["business_graph",       "business-analysis-engine"],
    ["future_simulation",    "future-state-simulation-engine"],
    ["decision_intelligence","decision-intelligence-engine"],
  ];

  for (const [domain, engineId] of remainingDomains) {
    await syncDomain(domain, engineId, []);
  }
}

// ── Main entry ────────────────────────────────────────────────────────────
export async function buildUnifiedKnowledgeGraph(userId: number | null): Promise<UnifiedGraphView> {
  // 1. Sync authoritative domain sources
  await Promise.all([
    loadBusinessDomain(),
    loadKnowledgeDomain(),
    loadGoalsDomain(),
  ]);
  await registerRemainingDomains();

  // 2. Deduplicate
  await deduplicateGraph();

  // 3. Compute graph stats
  const [nodeCntRows, edgeCntRows, evidenceCnt, regRows] = await Promise.all([
    db.select({ id: knowledgeGraphNodes.id }).from(knowledgeGraphNodes),
    db.select({ id: knowledgeGraphEdges.id }).from(knowledgeGraphEdges),
    countTotalEvidence(),
    db.select().from(graphRegistry),
  ]);
  const confidenceAvg = await computeAverageGraphConfidence();

  // 4. Create temporal snapshot
  const snapshotId = await createGraphSnapshot(userId);

  const domainRegistry: DomainRegistryEntry[] = regRows.map((r) => ({
    domain:    r.domain as KnowledgeGraphDomain,
    engineId:  r.engineId,
    nodeCount: r.nodeCount ?? 0,
    edgeCount: r.edgeCount ?? 0,
  }));

  return {
    totalNodes:    nodeCntRows.length,
    totalEdges:    edgeCntRows.length,
    totalDomains:  regRows.length,
    evidenceItems: evidenceCnt,
    confidenceAvg,
    lawApplied:    true,
    domainRegistry,
    snapshotId,
    computedAt:    new Date(),
  };
}

// ── Lightweight EB view ───────────────────────────────────────────────────
export async function fetchUnifiedGraphView(userId: number): Promise<UnifiedGraphView | null> {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) return null;

    const regRows = await db.select().from(graphRegistry);
    const domainRegistry: DomainRegistryEntry[] = regRows.map((r) => ({
      domain:    r.domain as KnowledgeGraphDomain,
      engineId:  r.engineId,
      nodeCount: r.nodeCount ?? 0,
      edgeCount: r.edgeCount ?? 0,
    }));

    return {
      totalNodes:    snapshot.nodeCount,
      totalEdges:    snapshot.edgeCount,
      totalDomains:  snapshot.domainCount,
      evidenceItems: snapshot.evidenceItems,
      confidenceAvg: snapshot.confidenceAvg,
      lawApplied:    snapshot.lawApplied,
      domainRegistry,
      snapshotId:    snapshot.id,
      computedAt:    snapshot.createdAt,
    };
  } catch {
    return null;
  }
}

export async function buildUnifiedGraphSummary(): Promise<string> {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) return "Knowledge graph not yet initialized.";
    return `Unified Knowledge Graph: ${snapshot.nodeCount} nodes across ${snapshot.domainCount} domains, ${snapshot.evidenceItems} evidence items, avg confidence ${(snapshot.confidenceAvg * 100).toFixed(0)}%.`;
  } catch {
    return "Knowledge graph summary unavailable.";
  }
}
