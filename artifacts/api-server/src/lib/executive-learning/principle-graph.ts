// ─── Build 013: Executive Principle Graph ─────────────────────────────────────
//
// Typed directed-edge graph connecting Executive Principles.
// Relationship types: supports | contradicts | generalizes | specializes |
//                     depends_on | supersedes | related_to
// BFS traversal (depth-capped at 4).
// Pure: receives principle lists, returns edge specs. DB layer is in registry.

import { randomUUID } from "crypto";
import type {
  ExecutivePrinciple,
  PrincipleRelationship,
  PrincipleRelationType,
} from "./types";

// ── Edge specification (before persistence) ───────────────────────────────────

export interface EdgeSpec {
  id: string;
  fromPrincipleId: string;
  toPrincipleId: string;
  relationType: PrincipleRelationType;
  strength: number;
  userId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function edgeid(): string {
  return `pgr_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

// ── Similarity helpers ────────────────────────────────────────────────────────

function sameDomain(a: ExecutivePrinciple, b: ExecutivePrinciple): boolean {
  return a.businessDomain === b.businessDomain;
}

function sameCategory(a: ExecutivePrinciple, b: ExecutivePrinciple): boolean {
  return a.category === b.category;
}

function sameStrategy(a: ExecutivePrinciple, b: ExecutivePrinciple): boolean {
  return a.strategicCategory === b.strategicCategory;
}

function overlappingOrigins(a: ExecutivePrinciple, b: ExecutivePrinciple): number {
  const setB = new Set(b.originCases);
  return a.originCases.filter((id) => setB.has(id)).length;
}

// ── RULE 1 — supports ─────────────────────────────────────────────────────────
// A → supports → B when:
//   • Same domain, same category, both positive (successRate > 0.6)
//   • A and B share overlapping origin cases

function detectSupports(
  a: ExecutivePrinciple,
  b: ExecutivePrinciple,
): EdgeSpec | null {
  if (a.id === b.id) return null;
  if (!sameDomain(a, b) || !sameCategory(a, b)) return null;
  const bothPositive = a.successRate > 0.6 && b.successRate > 0.6;
  if (!bothPositive) return null;
  const shared = overlappingOrigins(a, b);
  if (shared < 1) return null;
  const strength = Math.min(0.95, 0.5 + shared / 10 + (a.confidence + b.confidence) / 10);
  return {
    id: edgeid(), fromPrincipleId: a.id, toPrincipleId: b.id,
    relationType: "supports", strength, userId: a.userId,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  };
}

// ── RULE 2 — contradicts ──────────────────────────────────────────────────────
// A → contradicts → B when:
//   • Same domain
//   • One has successRate > 0.7, other has failureRate > 0.7
//   • Or opposite patternTypes for same domain

function detectContradicts(
  a: ExecutivePrinciple,
  b: ExecutivePrinciple,
): EdgeSpec | null {
  if (a.id === b.id) return null;
  if (!sameDomain(a, b)) return null;
  const aPositive = a.successRate > 0.65;
  const bNegative = b.failureRate > 0.65;
  const contradiction1 = aPositive && bNegative;
  const contradiction2 =
    (a.patternType === "repeated_success" && b.patternType === "repeated_failure") ||
    (a.patternType === "repeated_failure" && b.patternType === "repeated_success");
  if (!contradiction1 && !contradiction2) return null;
  return {
    id: edgeid(), fromPrincipleId: a.id, toPrincipleId: b.id,
    relationType: "contradicts", strength: 0.75, userId: a.userId,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  };
}

// ── RULE 3 — generalizes ──────────────────────────────────────────────────────
// A generalizes B when:
//   • A.generality > B.generality by at least 0.2
//   • A covers more domains (metadata.domains.length > B's)
//   • Same category or strategy

function detectGeneralizes(
  a: ExecutivePrinciple,
  b: ExecutivePrinciple,
): EdgeSpec | null {
  if (a.id === b.id) return null;
  if (!sameCategory(a, b) && !sameStrategy(a, b)) return null;
  const aGenerality = a.generality;
  const bGenerality = b.generality;
  if (aGenerality - bGenerality < 0.20) return null;
  const aDomains = ((a.metadata?.domains as string[]) ?? [a.businessDomain]).length;
  const bDomains = ((b.metadata?.domains as string[]) ?? [b.businessDomain]).length;
  if (aDomains <= bDomains) return null;
  const strength = Math.min(0.9, 0.5 + (aGenerality - bGenerality));
  return {
    id: edgeid(), fromPrincipleId: a.id, toPrincipleId: b.id,
    relationType: "generalizes", strength, userId: a.userId,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  };
}

// ── RULE 4 — specializes ──────────────────────────────────────────────────────
// Symmetric inverse of generalizes

function detectSpecializes(
  a: ExecutivePrinciple,
  b: ExecutivePrinciple,
): EdgeSpec | null {
  return detectGeneralizes(b, a)
    ? {
        id: edgeid(), fromPrincipleId: a.id, toPrincipleId: b.id,
        relationType: "specializes", strength: 0.6, userId: a.userId,
        isActive: true, createdAt: new Date(), updatedAt: new Date(),
      }
    : null;
}

// ── RULE 5 — depends_on ───────────────────────────────────────────────────────
// A depends_on B when:
//   • patternType of A is "repeated_execution_path" and B is "repeated_planning_strategy"
//   • Same strategicCategory

function detectDependsOn(
  a: ExecutivePrinciple,
  b: ExecutivePrinciple,
): EdgeSpec | null {
  if (a.id === b.id) return null;
  if (
    a.patternType === "repeated_execution_path" &&
    b.patternType === "repeated_planning_strategy" &&
    sameStrategy(a, b)
  ) {
    return {
      id: edgeid(), fromPrincipleId: a.id, toPrincipleId: b.id,
      relationType: "depends_on", strength: 0.70, userId: a.userId,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    };
  }
  return null;
}

// ── RULE 6 — supersedes ───────────────────────────────────────────────────────
// A supersedes B when:
//   • Same patternType, same domain, same outcome
//   • A was created later and has higher confidence
//   • A has more observations

function detectSupersedes(
  a: ExecutivePrinciple,
  b: ExecutivePrinciple,
): EdgeSpec | null {
  if (a.id === b.id) return null;
  if (a.patternType !== b.patternType) return null;
  if (!sameDomain(a, b)) return null;
  const aLater = a.createdAt > b.createdAt;
  const aMoreConfident = a.confidence - b.confidence >= 0.15;
  const aMoreObserved = a.timesObserved > b.timesObserved;
  if (!aLater || !aMoreConfident || !aMoreObserved) return null;
  return {
    id: edgeid(), fromPrincipleId: a.id, toPrincipleId: b.id,
    relationType: "supersedes", strength: 0.85, userId: a.userId,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  };
}

// ── RULE 7 — related_to ───────────────────────────────────────────────────────
// A related_to B when:
//   • Same category OR same domain, but none of the stronger relations apply
//   • Overlap in origin cases ≥ 1 OR same strategy

function detectRelatedTo(
  a: ExecutivePrinciple,
  b: ExecutivePrinciple,
  existingEdge: boolean,
): EdgeSpec | null {
  if (a.id === b.id || existingEdge) return null;
  const sameCtx = sameCategory(a, b) || sameDomain(a, b) || sameStrategy(a, b);
  if (!sameCtx) return null;
  const overlap = overlappingOrigins(a, b);
  if (overlap < 1 && !sameStrategy(a, b)) return null;
  return {
    id: edgeid(), fromPrincipleId: a.id, toPrincipleId: b.id,
    relationType: "related_to", strength: 0.45, userId: a.userId,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  };
}

// ── Build graph edges for a batch of principles ───────────────────────────────
// Returns edge specs to persist. Deduplicates by (from, to, relationType).

export function buildGraphEdges(
  principles: ExecutivePrinciple[],
): EdgeSpec[] {
  const seen = new Set<string>();
  const edges: EdgeSpec[] = [];

  function addEdge(e: EdgeSpec | null): void {
    if (!e) return;
    const key = `${e.fromPrincipleId}::${e.toPrincipleId}::${e.relationType}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(e);
  }

  for (let i = 0; i < principles.length; i++) {
    for (let j = 0; j < principles.length; j++) {
      if (i === j) continue;
      const a = principles[i]!;
      const b = principles[j]!;

      addEdge(detectSupports(a, b));
      addEdge(detectContradicts(a, b));
      addEdge(detectGeneralizes(a, b));
      addEdge(detectSpecializes(a, b));
      addEdge(detectDependsOn(a, b));
      addEdge(detectSupersedes(a, b));

      const hasStrongerEdge = seen.has(`${a.id}::${b.id}::supports`) ||
        seen.has(`${a.id}::${b.id}::contradicts`) ||
        seen.has(`${a.id}::${b.id}::generalizes`) ||
        seen.has(`${a.id}::${b.id}::specializes`) ||
        seen.has(`${a.id}::${b.id}::depends_on`) ||
        seen.has(`${a.id}::${b.id}::supersedes`);

      addEdge(detectRelatedTo(a, b, hasStrongerEdge));
    }
  }

  return edges;
}

// ── BFS traversal (depth-capped at 4) ────────────────────────────────────────

export interface GraphTraversalResult {
  nodes: string[];            // principleIds in traversal order
  edges: PrincipleRelationship[];
  depth: number;
}

export function bfsTraversal(
  startId: string,
  allEdges: PrincipleRelationship[],
  maxDepth = 4,
): GraphTraversalResult {
  const adjacency = new Map<string, PrincipleRelationship[]>();
  for (const e of allEdges) {
    if (!adjacency.has(e.fromPrincipleId)) adjacency.set(e.fromPrincipleId, []);
    adjacency.get(e.fromPrincipleId)!.push(e);
    // undirected for traversal purposes
    if (!adjacency.has(e.toPrincipleId)) adjacency.set(e.toPrincipleId, []);
    adjacency.get(e.toPrincipleId)!.push(e);
  }

  const visited = new Set<string>([startId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
  const resultNodes: string[] = [startId];
  const resultEdges: PrincipleRelationship[] = [];
  let maxReached = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;
    maxReached = Math.max(maxReached, current.depth);

    for (const edge of adjacency.get(current.id) ?? []) {
      const neighborId =
        edge.fromPrincipleId === current.id
          ? edge.toPrincipleId
          : edge.fromPrincipleId;
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        resultNodes.push(neighborId);
        resultEdges.push(edge);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      }
    }
  }

  return { nodes: resultNodes, edges: resultEdges, depth: maxReached };
}

// ── Describe a graph neighbourhood (for advisory text) ────────────────────────

export function describeNeighbourhood(
  principleId: string,
  allEdges: PrincipleRelationship[],
): string {
  const relevant = allEdges.filter(
    (e) => e.fromPrincipleId === principleId || e.toPrincipleId === principleId,
  );
  if (relevant.length === 0) return "No graph relationships yet.";
  const counts: Partial<Record<PrincipleRelationType, number>> = {};
  for (const e of relevant) counts[e.relationType] = (counts[e.relationType] ?? 0) + 1;
  return Object.entries(counts)
    .map(([rel, n]) => `${n} ${rel}`)
    .join(", ");
}
