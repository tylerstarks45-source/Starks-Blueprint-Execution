// ── Build 041: Temporal Evolution Engine ─────────────────────────────────
// Maintains time-aware graph snapshots so ASH can compare states over time.
import { db } from "@workspace/db";
import {
  graphTemporalHistory,
  graphSnapshots,
  knowledgeGraphNodes,
  knowledgeGraphEdges,
  graphEvidence,
  graphRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { computeAverageGraphConfidence } from "./kg-confidence-engine";

export async function recordNodeCreated(nodeId: number, label: string, domain: string): Promise<void> {
  await db.insert(graphTemporalHistory).values({
    nodeId,
    changeType:  "created",
    beforeState: null,
    afterState:  { label, domain, createdAt: new Date().toISOString() },
  });
}

export async function getNodeHistory(nodeId: number): Promise<Array<{
  id: number; changeType: string; beforeState: unknown; afterState: unknown; changedAt: Date;
}>> {
  const rows = await db
    .select()
    .from(graphTemporalHistory)
    .where(eq(graphTemporalHistory.nodeId, nodeId))
    .orderBy(desc(graphTemporalHistory.changedAt));
  return rows.map((r) => ({
    id:          r.id,
    changeType:  r.changeType,
    beforeState: r.beforeState,
    afterState:  r.afterState,
    changedAt:   r.changedAt,
  }));
}

// Create a point-in-time snapshot of the full unified knowledge graph.
export async function createGraphSnapshot(userId: number | null): Promise<number> {
  const [nodeCnt, edgeCnt, evCnt, regRows] = await Promise.all([
    db.select({ id: knowledgeGraphNodes.id }).from(knowledgeGraphNodes).then((r) => r.length),
    db.select({ id: knowledgeGraphEdges.id }).from(knowledgeGraphEdges).then((r) => r.length),
    db.select({ id: graphEvidence.id }).from(graphEvidence).then((r) => r.length),
    db.select({ domain: graphRegistry.domain }).from(graphRegistry),
  ]);
  const confidenceAvg = await computeAverageGraphConfidence();

  const [row] = await db.insert(graphSnapshots).values({
    userId:        userId ?? null,
    nodeCount:     nodeCnt,
    edgeCount:     edgeCnt,
    domainCount:   regRows.length,
    evidenceItems: evCnt,
    confidenceAvg,
    lawApplied:    true,
    snapshotData:  {
      domains: regRows.map((r) => r.domain),
      computedAt: new Date().toISOString(),
    },
  }).returning({ id: graphSnapshots.id });

  return row.id;
}

export async function getLatestSnapshot(userId?: number): Promise<{
  id: number; nodeCount: number; edgeCount: number; domainCount: number;
  evidenceItems: number; confidenceAvg: number; lawApplied: boolean; createdAt: Date;
} | null> {
  const rows = await db
    .select()
    .from(graphSnapshots)
    .orderBy(desc(graphSnapshots.createdAt))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id:            r.id,
    nodeCount:     r.nodeCount,
    edgeCount:     r.edgeCount,
    domainCount:   r.domainCount,
    evidenceItems: r.evidenceItems,
    confidenceAvg: r.confidenceAvg ?? 0,
    lawApplied:    r.lawApplied ?? true,
    createdAt:     r.createdAt,
  };
}

export async function listSnapshots(limit = 10): Promise<Array<{
  id: number; nodeCount: number; edgeCount: number; createdAt: Date;
}>> {
  const rows = await db
    .select()
    .from(graphSnapshots)
    .orderBy(desc(graphSnapshots.createdAt))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, nodeCount: r.nodeCount, edgeCount: r.edgeCount, createdAt: r.createdAt }));
}
