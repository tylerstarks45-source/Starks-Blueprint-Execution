// ── Build 041: Graph Identity Engine ─────────────────────────────────────
// Creates globally unique cognitive identities via deterministic hashing.
import { db } from "@workspace/db";
import { graphIdentityMap, knowledgeGraphNodes } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { KnowledgeGraphDomain, KnowledgeGraphNodeType } from "./types";

// Deterministic string hash (djb2 variant — no crypto dependency needed).
export function computeIdentityHash(
  domain: string,
  nodeType: string,
  externalRefType: string | null,
  externalRefId: string | null,
  label: string,
): string {
  const raw = `${domain}::${nodeType}::${externalRefType ?? ""}::${externalRefId ?? ""}::${label}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) + h) ^ raw.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return `kg_${h.toString(16).padStart(8, "0")}`;
}

export function buildCanonicalId(domain: string, nodeType: string, hash: string): string {
  return `${domain}_${nodeType}_${hash}`;
}

// Upsert a node identity — returns existing nodeId if already registered.
export async function resolveNodeIdentity(params: {
  domain:          KnowledgeGraphDomain;
  nodeType:        KnowledgeGraphNodeType;
  externalRefType: string | null;
  externalRefId:   string | null;
  label:           string;
  description:     string | null;
  sourceEngine:    string;
  metadata?:       Record<string, unknown>;
}): Promise<{ nodeId: number; isNew: boolean; identityHash: string }> {
  const identityHash = computeIdentityHash(
    params.domain, params.nodeType, params.externalRefType, params.externalRefId, params.label,
  );
  const canonicalId = buildCanonicalId(params.domain, params.nodeType, identityHash);

  // Check identity map first
  const existing = await db
    .select()
    .from(graphIdentityMap)
    .where(eq(graphIdentityMap.identityHash, identityHash))
    .limit(1);

  if (existing.length > 0 && existing[0].nodeId != null) {
    return { nodeId: existing[0].nodeId!, isNew: false, identityHash };
  }

  // Create the node
  const [node] = await db.insert(knowledgeGraphNodes).values({
    nodeType:        params.nodeType,
    domain:          params.domain,
    externalRefType: params.externalRefType,
    externalRefId:   params.externalRefId,
    identityHash,
    label:           params.label,
    description:     params.description,
    metadata:        params.metadata ?? {},
    sourceEngine:    params.sourceEngine,
  }).returning({ id: knowledgeGraphNodes.id });

  // Register in identity map
  await db.insert(graphIdentityMap).values({
    canonicalId,
    sourceType:   params.externalRefType ?? params.domain,
    sourceId:     params.externalRefId ?? params.label,
    identityHash,
    nodeId:       node.id,
  }).onConflictDoNothing();

  return { nodeId: node.id, isNew: true, identityHash };
}
