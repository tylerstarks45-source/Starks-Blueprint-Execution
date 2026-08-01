---
name: Unified Cognitive Orchestration Engine
description: Build 040 — orchestrator that runs all 25 intelligence engines (Builds 015-039) in dependency-ordered waves; replaces 25 individual EB fetch blocks with one runUnifiedCognitiveCycle() call; table name and EP count notes.
---

## Core facts

- **9 new tables**: `cognitive_cycles`, `execution_graphs`, `orchestration_dependencies` (not `execution_dependencies` — see collision note below), `execution_waves`, `execution_diagnostics`, `confidence_flows`, `evidence_flows`, `orchestration_registry`, `orchestration_snapshots`
- **8 EPs** → **294 cumulative** (confirmed in boot log)
- **Routes**: `/api/orchestrator` — 2 POST (run/replay) + 8 GET (cycles/graph/dependencies/waves/diagnostics/confidence/evidence/registry)
- **EB throttle**: 280 cycles (`UCOS_THROTTLE_CYCLES = 280`)
- **Integration file**: `executive-brain/unified-orchestration-integration.ts`
- **Main orchestration fn**: `runUnifiedCognitiveCycle(userId)` in `unified-orchestration/ucos-orchestrator.ts`

## Architecture

25 engines run in 9 dependency-ordered waves. Engines within the same wave execute in parallel (Promise.all). Waves are sequential. businessId extracted from Wave 1 (business-graph) and injected into Wave 2+ engines that need it.

Early pipeline (Builds 007–014: goals, judgment, planning, execution, observation, reflection, learning, governance) stays in EB directly — they depend on message context and are stateful.

## Critical name collision

`execution_dependencies` is already exported from `operational_planning.ts`. The new schema uses `orchestrationDependencies` (table name: `orchestration_dependencies`). Do NOT reuse `executionDependencies` as an export name in any new schema file.

## EB refactor pattern

- Replaced lines 37–102 (26 individual integration imports) with single import block from `unified-orchestration-integration.ts`
- Replaced lines 351–694 (25 separate try/catch blocks) with one `runUnifiedCognitiveCycle()` call + destructuring (62 lines vs 345 lines)
- Advisory builders re-exported from `unified-orchestration-integration.ts` for backward compat — `buildContextNote` call unchanged except one new `unifiedOrchestrationSummary` param

## Unified Cognition Law

"No intelligence engine executes in isolation if its output depends on evidence produced by another registered engine." Enacted in `COGNITIVE_ENGINE_REGISTRY` wave assignments. All 25 engines comply.

**Why:** Without coordination, engines re-fetch the same upstream state independently, diverge on businessId, and race on throttle triggers. Wave execution ensures each engine has the upstream evidence its declared dependencies require.

**How to apply:** Any future engine added to COGNITIVE_ENGINE_REGISTRY must declare its `waveNumber` (must be > max wave of all its `dependencies`). The orchestrator enforces the law automatically.
