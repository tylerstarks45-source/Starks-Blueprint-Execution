// ─── Artifact Graph Service (Build 005) ──────────────────────────────────────
//
// The Cognitive Knowledge Graph semantic layer. Connects Cognitive Artifacts
// into an explainable, navigable network of typed, directional relationships.
//
// Architecture position in the Cognitive Lifecycle:
//   Observe → Reason → Decide → Record → Consolidate → [Graph] → Retrieve →
//   Reflect → Learn → Improve
//
// This module is responsible for:
//   - Relationship Model: creating and managing typed, directed, explainable
//     edges between Cognitive Artifacts.
//   - Artifact Graph Service: traversing the graph, finding neighborhoods,
//     finding paths.
//   - Knowledge Navigation: answering cognitive questions ("what influenced
//     this?", "what did this produce?", "what supports this?").
//   - Knowledge Clusters: grouping artifacts into named, typed clusters with
//     full membership provenance.
//
// Design invariants (inherited from Build 004):
//   - Never blocks the request path: all writes are awaitable by callers who
//     choose to await; call fire-and-forget with .catch() if latency matters.
//   - Fail-open: all functions log errors rather than propagating them to
//     crash the primary API server.
//   - Soft-delete only: is_deleted=true is the only removal path for
//     relationships. Hard-deletes are a human governance decision.
//   - Independent of Executive Brain logic: this service has no knowledge of
//     runExecutiveBrain(), runReasoningPipeline(), or any Brain-specific logic.
//
// DO NOT implement:
//   - Automatic relationship inference
//   - Autonomous learning
//   - Vector/semantic search
//   - Reasoning over the graph

import {
  db,
  cognitiveRelationshipsTable,
  cogitiveClustersTable,
  cognitiveClusterMembersTable,
  cognitiveArtifactsTable,
  COGNITIVE_RELATIONSHIP_TYPES,
  COGNITIVE_RELATIONSHIP_LIFECYCLE,
} from "@workspace/db";
import {
  eq,
  and,
  desc,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { logger } from "../logger";
import type { OrchestrationConfidence } from "./types";
import { queryArtifacts, type StoredCognitiveArtifact } from "./cognitive-memory";

// ─── Re-export types that routes and external consumers need ─────────────────

export type { CognitiveRelationshipType, CognitiveRelationshipLifecycle } from "@workspace/db";
export {
  COGNITIVE_RELATIONSHIP_TYPES,
  COGNITIVE_RELATIONSHIP_LIFECYCLE,
  COGNITIVE_CLUSTER_TYPES,
} from "@workspace/db";

// ─── Service-layer types ──────────────────────────────────────────────────────

/** Input for creating a new relationship edge. */
export interface CreateRelationshipInput {
  /** Optional — caller-supplied UUID. Generated via crypto.randomUUID() if omitted. */
  id?: string;
  sourceArtifactId: string;
  targetArtifactId: string;
  relationshipType: string;
  /** The Brain name or system component that is creating this edge. */
  createdBy: string;
  /** Required explainability field: why does this relationship exist? */
  creationReason: string;
  confidence?: OrchestrationConfidence;
  metadata?: Record<string, unknown>;
  userId?: number;
}

/** A Cognitive Relationship as returned from the graph service. */
export interface GraphRelationship {
  id: string;
  sourceArtifactId: string;
  targetArtifactId: string;
  relationshipType: string;
  createdBy: string;
  creationReason: string;
  confidence: string;
  lifecycleStatus: string;
  version: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  metadata: Record<string, unknown>;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A graph neighborhood: the subgraph within N hops of a center artifact. */
export interface GraphNeighborhood {
  centerArtifactId: string;
  nodes: StoredCognitiveArtifact[];
  edges: GraphRelationship[];
  /** The depth that was traversed. */
  depth: number;
  totalNodes: number;
  totalEdges: number;
}

/** Options for graph traversal. */
export interface TraversalOptions {
  /** Maximum hops from the center artifact. Default: 2. Max enforced: 4. */
  maxDepth?: number;
  /** Restrict to specific relationship types. Default: all active types. */
  relationshipTypes?: string[];
  /** Follow outbound, inbound, or both directions. Default: both. */
  direction?: "outbound" | "inbound" | "both";
}

/** Input for creating a Knowledge Cluster. */
export interface CreateClusterInput {
  id?: string;
  name: string;
  description?: string;
  clusterType?: string;
  metadata?: Record<string, unknown>;
  userId?: number;
}

/** A Knowledge Cluster as returned from the service. */
export interface KnowledgeCluster {
  id: string;
  name: string;
  description: string | null;
  clusterType: string;
  lifecycleStatus: string;
  metadata: Record<string, unknown>;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToRelationship(row: typeof cognitiveRelationshipsTable.$inferSelect): GraphRelationship {
  return {
    ...row,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function rowToCluster(row: typeof cogitiveClustersTable.$inferSelect): KnowledgeCluster {
  return {
    ...row,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

// ─── Cognitive Relationship Model ────────────────────────────────────────────

/** Create a typed, explainable directed edge between two Cognitive Artifacts.
 *  Validates that source and target differ.
 *  Idempotent on id: if an edge with the same id already exists, returns it. */
export async function createRelationship(input: CreateRelationshipInput): Promise<GraphRelationship> {
  if (input.sourceArtifactId === input.targetArtifactId) {
    throw new Error("A relationship cannot point from an artifact to itself");
  }

  const id = input.id ?? crypto.randomUUID();

  const [row] = await db
    .insert(cognitiveRelationshipsTable)
    .values({
      id,
      sourceArtifactId: input.sourceArtifactId,
      targetArtifactId: input.targetArtifactId,
      relationshipType: input.relationshipType,
      createdBy: input.createdBy,
      creationReason: input.creationReason,
      confidence: input.confidence ?? "unknown",
      lifecycleStatus: "active",
      version: 1,
      isDeleted: false,
      deletedAt: null,
      metadata: input.metadata ?? {},
      userId: input.userId ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (row) {
    logger.debug(
      { id, type: input.relationshipType, source: input.sourceArtifactId, target: input.targetArtifactId },
      "Cognitive relationship created",
    );
    return rowToRelationship(row);
  }

  // Was already present — load and return existing
  const existing = await getRelationship(id);
  if (!existing) throw new Error(`Failed to create or retrieve relationship ${id}`);
  return existing;
}

/** Retrieve a single relationship by id. Returns null if not found or soft-deleted. */
export async function getRelationship(id: string): Promise<GraphRelationship | null> {
  const rows = await db
    .select()
    .from(cognitiveRelationshipsTable)
    .where(and(eq(cognitiveRelationshipsTable.id, id), eq(cognitiveRelationshipsTable.isDeleted, false)))
    .limit(1);
  return rows[0] ? rowToRelationship(rows[0]) : null;
}

/** Soft-delete (revoke) a relationship. The edge is preserved for audit history
 *  but excluded from all standard graph queries.
 *  Use this when a relationship is disproved, retracted, or superseded. */
export async function revokeRelationship(id: string): Promise<void> {
  await db
    .update(cognitiveRelationshipsTable)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      lifecycleStatus: "revoked",
      updatedAt: new Date(),
    })
    .where(eq(cognitiveRelationshipsTable.id, id));
  logger.debug({ id }, "Cognitive relationship revoked");
}

/** Update a relationship's lifecycle status (e.g. active → archived).
 *  Increments version. Use revokeRelationship() to soft-delete. */
export async function updateRelationshipStatus(
  id: string,
  lifecycleStatus: string,
): Promise<void> {
  await db
    .update(cognitiveRelationshipsTable)
    .set({
      lifecycleStatus,
      version: sql`${cognitiveRelationshipsTable.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(cognitiveRelationshipsTable.id, id));
}

/** Return all active outbound edges from an artifact (source = artifactId).
 *  Optionally filter by relationship type. */
export async function getRelationshipsFrom(
  artifactId: string,
  types?: string[],
): Promise<GraphRelationship[]> {
  const conditions: SQL[] = [
    eq(cognitiveRelationshipsTable.sourceArtifactId, artifactId),
    eq(cognitiveRelationshipsTable.isDeleted, false),
  ];
  if (types && types.length > 0) {
    conditions.push(inArray(cognitiveRelationshipsTable.relationshipType, types));
  }
  const rows = await db
    .select()
    .from(cognitiveRelationshipsTable)
    .where(and(...conditions))
    .orderBy(desc(cognitiveRelationshipsTable.createdAt));
  return rows.map(rowToRelationship);
}

/** Return all active inbound edges to an artifact (target = artifactId).
 *  Optionally filter by relationship type. */
export async function getRelationshipsTo(
  artifactId: string,
  types?: string[],
): Promise<GraphRelationship[]> {
  const conditions: SQL[] = [
    eq(cognitiveRelationshipsTable.targetArtifactId, artifactId),
    eq(cognitiveRelationshipsTable.isDeleted, false),
  ];
  if (types && types.length > 0) {
    conditions.push(inArray(cognitiveRelationshipsTable.relationshipType, types));
  }
  const rows = await db
    .select()
    .from(cognitiveRelationshipsTable)
    .where(and(...conditions))
    .orderBy(desc(cognitiveRelationshipsTable.createdAt));
  return rows.map(rowToRelationship);
}

/** Return both outbound and inbound edges for an artifact. */
export async function getRelationshipsFor(
  artifactId: string,
): Promise<{ outbound: GraphRelationship[]; inbound: GraphRelationship[] }> {
  const [outbound, inbound] = await Promise.all([
    getRelationshipsFrom(artifactId),
    getRelationshipsTo(artifactId),
  ]);
  return { outbound, inbound };
}

// ─── Artifact Graph Service — Graph Traversal ─────────────────────────────────

/** Internal: batch-load all active relationships touching any of the given
 *  artifact ids, in either or both directions. Used by BFS traversal to
 *  minimize DB round-trips (one query per depth level, not per node). */
async function batchLoadRelationships(
  artifactIds: string[],
  direction: "outbound" | "inbound" | "both",
  types?: string[],
): Promise<GraphRelationship[]> {
  if (artifactIds.length === 0) return [];

  const idSet = sql`${sql.raw("'" + artifactIds.join("','") + "'")}`;

  const dirConditions: SQL[] = [];
  if (direction === "outbound" || direction === "both") {
    dirConditions.push(
      sql`${cognitiveRelationshipsTable.sourceArtifactId} IN (${sql.join(
        artifactIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }
  if (direction === "inbound" || direction === "both") {
    dirConditions.push(
      sql`${cognitiveRelationshipsTable.targetArtifactId} IN (${sql.join(
        artifactIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }

  const conditions: SQL[] = [
    eq(cognitiveRelationshipsTable.isDeleted, false),
    dirConditions.length === 1 ? dirConditions[0]! : sql`(${sql.join(dirConditions, sql` OR `)})`,
  ];

  if (types && types.length > 0) {
    conditions.push(inArray(cognitiveRelationshipsTable.relationshipType, types));
  }

  const rows = await db
    .select()
    .from(cognitiveRelationshipsTable)
    .where(and(...conditions));
  return rows.map(rowToRelationship);
}

/** Internal: batch-load artifact records by their ids.
 *  Returns only active artifacts (lifecycle_status = 'active'). */
async function loadArtifactsByIds(ids: string[]): Promise<StoredCognitiveArtifact[]> {
  if (ids.length === 0) return [];
  return queryArtifacts({ ids, limit: ids.length });
}

/** Return the N-hop subgraph centered on a Cognitive Artifact.
 *  Uses breadth-first traversal with one batch DB query per depth level
 *  to minimize round-trips.
 *
 *  maxDepth is capped at 4 to prevent runaway queries on dense graphs. */
export async function getGraphNeighborhood(
  centerArtifactId: string,
  options: TraversalOptions = {},
): Promise<GraphNeighborhood> {
  const maxDepth = Math.min(options.maxDepth ?? 2, 4);
  const direction = options.direction ?? "both";
  const types = options.relationshipTypes;

  const visitedIds = new Set<string>([centerArtifactId]);
  const seenEdgeIds = new Set<string>();
  const allEdges: GraphRelationship[] = [];
  let currentLevel = [centerArtifactId];

  for (let depth = 0; depth < maxDepth && currentLevel.length > 0; depth++) {
    const levelEdges = await batchLoadRelationships(currentLevel, direction, types);
    const nextLevel: string[] = [];

    for (const edge of levelEdges) {
      if (seenEdgeIds.has(edge.id)) continue;
      seenEdgeIds.add(edge.id);
      allEdges.push(edge);

      const neighborId =
        edge.sourceArtifactId === currentLevel[0] || visitedIds.has(edge.sourceArtifactId)
          ? edge.targetArtifactId
          : edge.sourceArtifactId;

      // For "both" direction, check both sides
      const candidates =
        direction === "both"
          ? [edge.sourceArtifactId, edge.targetArtifactId]
          : direction === "outbound"
            ? [edge.targetArtifactId]
            : [edge.sourceArtifactId];

      for (const cid of candidates) {
        if (!visitedIds.has(cid)) {
          visitedIds.add(cid);
          nextLevel.push(cid);
        }
      }
    }

    currentLevel = nextLevel;
  }

  const nodes = await loadArtifactsByIds(Array.from(visitedIds));

  return {
    centerArtifactId,
    nodes,
    edges: allEdges,
    depth: maxDepth,
    totalNodes: visitedIds.size,
    totalEdges: allEdges.length,
  };
}

/** Find the shortest path (sequence of artifact ids) between two artifacts
 *  using BFS. Returns null if no path exists within maxDepth hops.
 *  maxDepth is capped at 6. */
export async function findPath(
  fromArtifactId: string,
  toArtifactId: string,
  maxDepth = 4,
): Promise<string[] | null> {
  if (fromArtifactId === toArtifactId) return [fromArtifactId];
  const cap = Math.min(maxDepth, 6);

  // BFS with parent tracking to reconstruct path
  const visited = new Map<string, string | null>([[fromArtifactId, null]]);
  let frontier = [fromArtifactId];

  for (let depth = 0; depth < cap && frontier.length > 0; depth++) {
    const edges = await batchLoadRelationships(frontier, "both");
    const nextFrontier: string[] = [];

    for (const edge of edges) {
      const neighbors = [edge.sourceArtifactId, edge.targetArtifactId];
      for (const nid of neighbors) {
        if (!visited.has(nid)) {
          visited.set(nid, edge.sourceArtifactId === nid ? edge.targetArtifactId : edge.sourceArtifactId);
          nextFrontier.push(nid);
          if (nid === toArtifactId) {
            // Reconstruct path
            const path: string[] = [toArtifactId];
            let cur: string | null = toArtifactId;
            while (cur !== null && cur !== fromArtifactId) {
              cur = visited.get(cur) ?? null;
              if (cur !== null) path.unshift(cur);
            }
            return path;
          }
        }
      }
    }

    frontier = nextFrontier;
  }

  return null;
}

// ─── Knowledge Navigation ────────────────────────────────────────────────────
//
// Answer cognitive questions by navigating the Knowledge Graph.
// Each function is named for the question it answers, not the query it runs.

/** "What knowledge is related to this artifact?"
 *  Returns all active artifacts directly connected by any (or specific) edge types. */
export async function findRelatedKnowledge(
  artifactId: string,
  types?: string[],
): Promise<StoredCognitiveArtifact[]> {
  const { outbound, inbound } = await getRelationshipsFor(artifactId);
  const relevantEdges = types
    ? [...outbound, ...inbound].filter((e) => types.includes(e.relationshipType))
    : [...outbound, ...inbound];

  const connectedIds = new Set(
    relevantEdges.flatMap((e) => [e.sourceArtifactId, e.targetArtifactId]).filter((id) => id !== artifactId),
  );
  return loadArtifactsByIds(Array.from(connectedIds));
}

/** "What decisions influenced this strategy?"
 *  Returns artifacts that have a `supports`, `produces`, `depends_on`, or
 *  `derived_from` edge pointing TO the given artifact. */
export async function findInfluencingDecisions(artifactId: string): Promise<StoredCognitiveArtifact[]> {
  const inbound = await getRelationshipsTo(artifactId, [
    "supports",
    "produces",
    "depends_on",
    "derived_from",
    "explains",
    "validates",
  ]);
  const ids = [...new Set(inbound.map((e) => e.sourceArtifactId))];
  return loadArtifactsByIds(ids);
}

/** "What lessons emerged from this objective?"
 *  Returns artifacts that this artifact `produces` or that are `derived_from` it. */
export async function findProducedArtifacts(artifactId: string): Promise<StoredCognitiveArtifact[]> {
  const outbound = await getRelationshipsFrom(artifactId, ["produces", "derived_from", "explains"]);
  const ids = [...new Set(outbound.map((e) => e.targetArtifactId))];
  return loadArtifactsByIds(ids);
}

/** "Which artifacts support this conclusion?"
 *  Returns artifacts connected by `supports` or `validates` edges. */
export async function findSupportingArtifacts(artifactId: string): Promise<StoredCognitiveArtifact[]> {
  const inbound = await getRelationshipsTo(artifactId, ["supports", "validates", "references"]);
  const ids = [...new Set(inbound.map((e) => e.sourceArtifactId))];
  return loadArtifactsByIds(ids);
}

/** "What does this artifact contradict?"
 *  Returns artifacts connected by `contradicts` edges (outbound). */
export async function findContradictions(artifactId: string): Promise<StoredCognitiveArtifact[]> {
  const outbound = await getRelationshipsFrom(artifactId, ["contradicts"]);
  const ids = outbound.map((e) => e.targetArtifactId);
  return loadArtifactsByIds(ids);
}

/** "What has this artifact been superseded by?"
 *  Returns the artifact that supersedes the given one (if any). */
export async function findSupersedingArtifact(artifactId: string): Promise<StoredCognitiveArtifact | null> {
  const inbound = await getRelationshipsTo(artifactId, ["supersedes"]);
  if (inbound.length === 0) return null;
  // Take the most recent
  const latestSuperseder = inbound.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0]!;
  const artifacts = await loadArtifactsByIds([latestSuperseder.sourceArtifactId]);
  return artifacts[0] ?? null;
}

// ─── Knowledge Clusters ──────────────────────────────────────────────────────
//
// Knowledge Clusters are named groupings of closely-related Cognitive Artifacts.
// Currently manual only. Future builds may auto-classify by connected component,
// topic similarity, or reinforcement signal.
//
// Every membership must carry: who added it (addedBy) and why (membershipReason).

/** Create a new Knowledge Cluster. */
export async function createCluster(input: CreateClusterInput): Promise<KnowledgeCluster> {
  const id = input.id ?? crypto.randomUUID();
  const [row] = await db
    .insert(cogitiveClustersTable)
    .values({
      id,
      name: input.name,
      description: input.description ?? null,
      clusterType: input.clusterType ?? "manual",
      lifecycleStatus: "active",
      metadata: input.metadata ?? {},
      userId: input.userId ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to create cluster");
  logger.debug({ id, name: input.name }, "Knowledge cluster created");
  return rowToCluster(row);
}

/** Retrieve a cluster by id. Returns null if not found. */
export async function getCluster(clusterId: string): Promise<KnowledgeCluster | null> {
  const rows = await db
    .select()
    .from(cogitiveClustersTable)
    .where(
      and(
        eq(cogitiveClustersTable.id, clusterId),
        eq(cogitiveClustersTable.lifecycleStatus, "active"),
      ),
    )
    .limit(1);
  return rows[0] ? rowToCluster(rows[0]) : null;
}

/** List all active clusters for a user (or all clusters if userId omitted). */
export async function listClusters(userId?: number, limit = 50): Promise<KnowledgeCluster[]> {
  const conditions: SQL[] = [eq(cogitiveClustersTable.lifecycleStatus, "active")];
  if (userId !== undefined) conditions.push(eq(cogitiveClustersTable.userId, userId));
  const rows = await db
    .select()
    .from(cogitiveClustersTable)
    .where(and(...conditions))
    .orderBy(desc(cogitiveClustersTable.createdAt))
    .limit(limit);
  return rows.map(rowToCluster);
}

/** Archive (soft-delete) a cluster. Memberships are preserved. */
export async function archiveCluster(clusterId: string): Promise<void> {
  await db
    .update(cogitiveClustersTable)
    .set({ lifecycleStatus: "archived", updatedAt: new Date() })
    .where(eq(cogitiveClustersTable.id, clusterId));
}

/** Add an artifact to a cluster.
 *  Idempotent: if the artifact is already in the cluster, this is a no-op. */
export async function addArtifactToCluster(
  clusterId: string,
  artifactId: string,
  membershipReason: string,
  addedBy: string,
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .insert(cognitiveClusterMembersTable)
    .values({ id, clusterId, artifactId, membershipReason, addedBy })
    .onConflictDoNothing();
  logger.debug({ clusterId, artifactId, addedBy }, "Artifact added to knowledge cluster");
}

/** Remove an artifact from a cluster (hard-delete of the membership row).
 *  Membership removal is not sensitive — it's a grouping change, not audit data. */
export async function removeArtifactFromCluster(
  clusterId: string,
  artifactId: string,
): Promise<void> {
  await db
    .delete(cognitiveClusterMembersTable)
    .where(
      and(
        eq(cognitiveClusterMembersTable.clusterId, clusterId),
        eq(cognitiveClusterMembersTable.artifactId, artifactId),
      ),
    );
}

/** Return all Cognitive Artifacts in a cluster. */
export async function getClusterArtifacts(clusterId: string): Promise<StoredCognitiveArtifact[]> {
  const members = await db
    .select({ artifactId: cognitiveClusterMembersTable.artifactId })
    .from(cognitiveClusterMembersTable)
    .where(eq(cognitiveClusterMembersTable.clusterId, clusterId));
  const ids = members.map((m) => m.artifactId);
  return loadArtifactsByIds(ids);
}

/** Return all clusters an artifact belongs to. */
export async function findClustersForArtifact(artifactId: string): Promise<KnowledgeCluster[]> {
  const members = await db
    .select({ clusterId: cognitiveClusterMembersTable.clusterId })
    .from(cognitiveClusterMembersTable)
    .where(eq(cognitiveClusterMembersTable.artifactId, artifactId));
  if (members.length === 0) return [];
  const clusterIds = members.map((m) => m.clusterId);
  const rows = await db
    .select()
    .from(cogitiveClustersTable)
    .where(
      and(
        inArray(cogitiveClustersTable.id, clusterIds),
        eq(cogitiveClustersTable.lifecycleStatus, "active"),
      ),
    );
  return rows.map(rowToCluster);
}

/** Return all cluster members with their metadata for a cluster. */
export async function getClusterMembers(
  clusterId: string,
): Promise<Array<{ artifactId: string; addedBy: string; membershipReason: string | null; createdAt: Date }>> {
  const rows = await db
    .select()
    .from(cognitiveClusterMembersTable)
    .where(eq(cognitiveClusterMembersTable.clusterId, clusterId))
    .orderBy(desc(cognitiveClusterMembersTable.createdAt));
  return rows.map((r) => ({
    artifactId: r.artifactId,
    addedBy: r.addedBy,
    membershipReason: r.membershipReason,
    createdAt: r.createdAt,
  }));
}

/** Return summary statistics for an artifact's graph position.
 *  Useful for the future Graph health endpoint and Self-Improving Brain. */
export async function getArtifactGraphStats(artifactId: string): Promise<{
  outboundEdges: number;
  inboundEdges: number;
  totalEdges: number;
  relationshipTypes: string[];
  clusterCount: number;
}> {
  const [{ outbound, inbound }, clusters] = await Promise.all([
    getRelationshipsFor(artifactId),
    findClustersForArtifact(artifactId),
  ]);

  const allEdges = [...outbound, ...inbound];
  const uniqueTypes = [...new Set(allEdges.map((e) => e.relationshipType))];

  return {
    outboundEdges: outbound.length,
    inboundEdges: inbound.length,
    totalEdges: allEdges.length,
    relationshipTypes: uniqueTypes,
    clusterCount: clusters.length,
  };
}
