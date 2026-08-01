// ── Build 041: Evidence Linking Engine ───────────────────────────────────
// Links every conclusion back to its supporting evidence.
import { db } from "@workspace/db";
import { graphEvidence } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { KGEvidenceRecord } from "./types";

export async function linkEvidence(params: {
  nodeId?:         number;
  edgeId?:         number;
  sourceEngine:    string;
  evidenceType:    string;
  confidenceValue: number;
  data?:           Record<string, unknown>;
}): Promise<number> {
  const [row] = await db.insert(graphEvidence).values({
    nodeId:          params.nodeId ?? null,
    edgeId:          params.edgeId ?? null,
    sourceEngine:    params.sourceEngine,
    evidenceType:    params.evidenceType,
    confidenceValue: params.confidenceValue,
    data:            params.data ?? {},
  }).returning({ id: graphEvidence.id });
  return row.id;
}

export async function getNodeEvidence(nodeId: number): Promise<KGEvidenceRecord[]> {
  const rows = await db
    .select()
    .from(graphEvidence)
    .where(eq(graphEvidence.nodeId, nodeId));
  return rows.map((r) => ({
    nodeId:          r.nodeId,
    edgeId:          r.edgeId,
    sourceEngine:    r.sourceEngine,
    evidenceType:    r.evidenceType,
    confidenceValue: r.confidenceValue ?? 0.5,
  }));
}

export async function countTotalEvidence(): Promise<number> {
  const rows = await db.select({ id: graphEvidence.id }).from(graphEvidence);
  return rows.length;
}

// Bulk-link evidence for a set of nodes from a single engine scan.
export async function bulkLinkEvidence(
  items: Array<{
    nodeId:       number;
    sourceEngine: string;
    evidenceType: string;
    confidence:   number;
    data?:        Record<string, unknown>;
  }>,
): Promise<number> {
  if (items.length === 0) return 0;
  await db.insert(graphEvidence).values(
    items.map((it) => ({
      nodeId:          it.nodeId,
      edgeId:          null,
      sourceEngine:    it.sourceEngine,
      evidenceType:    it.evidenceType,
      confidenceValue: it.confidence,
      data:            it.data ?? {},
    })),
  );
  return items.length;
}
