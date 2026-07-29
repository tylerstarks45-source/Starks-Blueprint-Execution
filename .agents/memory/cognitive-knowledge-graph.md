---
name: Cognitive Knowledge Graph (Build 005)
description: Typed directed-edge relationship model, Artifact Graph Service, Knowledge Navigation, and Knowledge Clusters layered on top of Build 004 cognitive_artifacts.
---

# Cognitive Knowledge Graph

## Rule
The Knowledge Graph is a separate layer on top of cognitive_artifacts — it does NOT modify or rewrite Build 004. It adds relationships (directed edges) and clusters (groupings) without touching cognitive-memory.ts logic.

## Why
Memory alone is not knowledge. Knowledge emerges from relationships between memories. Build 005 provides the semantic layer so future Brains can navigate artifact relationships rather than just querying isolated records.

## How to apply
- Create a relationship: call `createRelationship(input: CreateRelationshipInput)` from `artifact-graph.ts`. Always provide `createdBy` and `creationReason` — these are non-optional explainability fields.
- Soft-delete a relationship: call `revokeRelationship(id)`. Never hard-delete — the graph must remain historically auditable.
- Traverse the graph: call `getGraphNeighborhood(artifactId, { maxDepth, direction, relationshipTypes })`. maxDepth is capped at 4 to prevent runaway queries. BFS uses one batch DB query per depth level.
- Knowledge navigation questions → functions:
  - "What influenced this?" → `findInfluencingDecisions(artifactId)`
  - "What did this produce?" → `findProducedArtifacts(artifactId)`
  - "What supports this?" → `findSupportingArtifacts(artifactId)`
  - "What is related?" → `findRelatedKnowledge(artifactId, types?)`
  - "What does this contradict?" → `findContradictions(artifactId)` (not yet routed)
  - "Shortest path?" → `findPath(fromId, toId, maxDepth?)`
- Clusters: `createCluster` → `addArtifactToCluster` → `getClusterArtifacts`. Every membership needs `addedBy` and `membershipReason`.
- New relationship types: add to `COGNITIVE_RELATIONSHIP_TYPES` const in `lib/db/src/schema/cognitive_graph.ts` — no schema migration needed (discriminator pattern).

## Schema pattern — same as Build 004
- UUID text PKs (not serial integers) — consistent with cognitive_artifacts
- Soft-delete via `is_deleted` boolean + `deleted_at` timestamp
- `metadata` JSONB on every table as forward-compatibility escape hatch
- DDL applied manually via `node -e require('/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg')...` — NOT drizzle-kit push
- After schema changes: `cd lib/db && npx tsc --build --force`

## Key files
- `lib/db/src/schema/cognitive_graph.ts` — 3 tables: cognitive_relationships, cognitive_clusters, cognitive_cluster_members
- `artifacts/api-server/src/lib/cognitive-foundation/artifact-graph.ts` — full graph service (relationships + navigation + clusters)
- cognitive-memory.ts — extended: ArtifactQuery.ids field added for graph neighborhood batch-loading

## New API surface (Build 005 adds 16 endpoints)
All under `/api/executive-brain/graph/...`
- Relationships: POST /relationships, GET|DELETE /relationships/:id, GET /artifacts/:id/relationships
- Traversal: GET /artifacts/:id/neighborhood, GET /artifacts/:id/stats, GET /artifacts/:id/path
- Navigation: GET /artifacts/:id/related, /influencing, /produced, /supporting
- Clusters: POST|GET /clusters, GET|DELETE /clusters/:id, POST /clusters/:id/members, DELETE /clusters/:id/members/:artifactId, GET /clusters/:id/artifacts, GET /artifacts/:id/clusters

## Gotchas
- `cogitiveClustersTable` is the Drizzle table name (typo: "cognitve" not "cognitive") — matches the DB column name `cognitive_clusters`. Don't rename without a migration.
- `batchLoadRelationships` in artifact-graph.ts uses sql template literals for IN clause — not Drizzle's `inArray` — because the condition spans two columns (source OR target).
- `findProducedArtifacts` is the spec's "findProducedLessons" (renamed to be more general since "lessons" is a specific artifact type that doesn't exist yet).
