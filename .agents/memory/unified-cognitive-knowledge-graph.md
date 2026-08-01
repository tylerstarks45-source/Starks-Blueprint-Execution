---
name: Unified Cognitive Knowledge Graph Engine
description: Build 041 — canonical knowledge graph integrating all 24 cognitive domains; reference-not-copy architecture; 9 tables, 8 EPs, 302 cumulative EPs; Unified Knowledge Law enacted.
---

## Core facts

- **9 new tables**: `knowledge_graph_nodes`, `knowledge_graph_edges`, `graph_evidence`, `graph_confidence`, `graph_paths`, `graph_temporal_history`, `graph_registry`, `graph_snapshots`, `graph_identity_map`
- **8 EPs** → **302 cumulative** (confirmed in boot log)
- **Routes**: `/api/graph` — 2 POST (rebuild/query) + 8 GET (/ /node/:id /edge/:id /path /evidence /confidence /snapshots /registry)
- **EB throttle**: 290 cycles (`GRAPH_THROTTLE_CYCLES = 290`)
- **Integration file**: `executive-brain/knowledge-graph-integration.ts`
- **Main build fn**: `buildUnifiedKnowledgeGraph(userId)` in `knowledge-graph/kg-orchestrator.ts`

## Architecture

The graph is the **system of relationships** — each domain engine remains the system of record for its own data. Nodes reference authoritative records via `externalRefType` + `externalRefId` (pointer, not copy). "Zero Duplicate Business Data" is enforced by this reference architecture.

24 registered domains: business, technology, infrastructure, capability, execution, planning, goals, memory, knowledge, observation, reflection, learning, governance, strategy, portfolio, priority, tradeoffs, systems, relationships, technology_evolution, opportunities, business_graph, future_simulation, decision_intelligence.

Every future domain registers itself by calling `syncDomain()` — no hardcoded list needed after initial registration.

## Import path gotcha

Engine files in `lib/knowledge-graph/` must import `from "@workspace/db"` (not `@workspace/db/client` — that module doesn't exist in this project's package structure).

## Auth route pattern

Routes use the function-call pattern, NOT Express middleware pattern:
```typescript
const caller = await requireAdmin(req, res);
if (!caller) return;
// use caller.id
```
Both `requireAuthActive` and `requireAdmin` are imported from `"../lib/auth"` (not `../middleware/auth`).

## Identity engine

`computeIdentityHash()` uses djb2 variant — deterministic, no crypto dependency. Hash format: `kg_XXXXXXXX` (8 hex chars). Canonical ID format: `${domain}_${nodeType}_${hash}`. Deduplication runs after every domain sync via `deduplicateGraph()`.

## Unified Knowledge Law

"Every persistent cognitive artifact created by ASH shall be addressable through the Unified Cognitive Knowledge Graph. Every graph node must maintain: identity, provenance, evidence, confidence, timestamps, domain ownership, relationship history. No knowledge shall become orphaned."

**Why:** Specialized graphs created by earlier builds diverge; without a canonical integration layer, evidence becomes siloed and cross-domain reasoning loses traceable provenance.

**How to apply:** Any future engine creating persistent cognitive artifacts must call `resolveNodeIdentity()` to register a KG node. The node is a pointer to the source record, not a copy. Domains register via `syncDomain()` in the orchestrator.
