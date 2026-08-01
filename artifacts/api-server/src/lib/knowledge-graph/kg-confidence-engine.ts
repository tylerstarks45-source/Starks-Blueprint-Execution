// ── Build 041: Confidence Linking Engine ─────────────────────────────────
// Carries confidence through graph edges without losing provenance.
import { db } from "@workspace/db";
import { graphConfidence, graphEvidence } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { KGConfidenceRecord } from "./types";

const ATTENUATION_PER_HOP = 0.05;

// Compute and store confidence for a node from its evidence records.
export async function computeNodeConfidence(nodeId: number): Promise<number> {
  const evidenceRows = await db
    .select({ confidenceValue: graphEvidence.confidenceValue })
    .from(graphEvidence)
    .where(eq(graphEvidence.nodeId, nodeId));

  if (evidenceRows.length === 0) {
    await upsertNodeConfidence(nodeId, 0.5, "no-evidence-default", 0);
    return 0.5;
  }

  const vals = evidenceRows.map((r) => r.confidenceValue ?? 0.5);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const score = Math.min(1, Math.max(0, mean));
  await upsertNodeConfidence(nodeId, score, "evidence-mean", evidenceRows.length);
  return score;
}

export async function upsertNodeConfidence(
  nodeId: number,
  score: number,
  basis: string,
  evidenceCount: number,
): Promise<void> {
  await db.insert(graphConfidence).values({
    nodeId,
    confidenceScore: score,
    confidenceBasis: basis,
    evidenceCount,
  });
}

// Propagate confidence from a source node to a target node via an edge.
// Attenuates by ATTENUATION_PER_HOP per hop.
export function attenuateConfidence(sourceScore: number, hops: number): number {
  return Math.max(0, sourceScore * Math.pow(1 - ATTENUATION_PER_HOP, hops));
}

export async function getNodeConfidence(nodeId: number): Promise<KGConfidenceRecord | null> {
  const rows = await db
    .select()
    .from(graphConfidence)
    .where(eq(graphConfidence.nodeId, nodeId))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    nodeId:          r.nodeId,
    confidenceScore: r.confidenceScore ?? 0.5,
    confidenceBasis: r.confidenceBasis,
    evidenceCount:   r.evidenceCount ?? 0,
  };
}

export async function computeAverageGraphConfidence(): Promise<number> {
  const rows = await db
    .select({ score: graphConfidence.confidenceScore })
    .from(graphConfidence);
  if (rows.length === 0) return 0;
  const sum = rows.reduce((a, r) => a + (r.score ?? 0), 0);
  return sum / rows.length;
}
