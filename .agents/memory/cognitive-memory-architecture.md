---
name: Cognitive Memory Architecture (Build 004)
description: Durable cognitive artifact persistence — table, consolidation pipeline, retrieval service, and historical reasoning service.
---

# Cognitive Memory Architecture

## Rule
All Executive Brain Decision Records are automatically persisted to `cognitive_artifacts` as fire-and-forget consolidation from `runExecutiveBrain()`. The in-process ring buffer in `reasoning.ts` remains as the L1 hot cache; the DB is the persistent L2 store.

## Why
Build 003 left Decision Records as in-process ring buffer only — lost on restart. Build 004 adds durable persistence so ASH can answer "have I solved this before?" across sessions.

## How to apply
- New cognitive artifact types: add to `COGNITIVE_ARTIFACT_TYPES` constant in `lib/db/src/schema/cognitive_artifacts.ts` AND in `cognitive-memory.ts` — no schema migration needed (discriminator pattern).
- Persist a new artifact type: call `consolidate(input: CognitiveArtifactInput)` from `cognitive-memory.ts`. Always fire-and-forget with `.catch(logger.warn)` — never await in the request path.
- Query historical artifacts: use `queryArtifacts(filter)` from `cognitive-foundation` exports — composable by userId, type, lifecycle, confidence, objective keyword, Brain participant, time range.
- Text similarity (`findSimilarDecisions`) is keyword ILIKE today; upgrade to vector cosine when embeddings are available — the function signature is already designed for that.
- Consolidation hooks: `registerConsolidationHook(fn)` — future builds register lesson extraction, importance scoring, retention policy here. Hooks run after DB write; hook failures are non-fatal.
- Schema changes: use manual `executeSql` via `node -e "require('/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg').Pool..."` — NOT `drizzle-kit push` (drizzle-kit push hazard with scheduler_state).
- After schema changes: rebuild db declarations with `cd lib/db && npx tsc --build --force` before typechecking api-server.

## Key files
- `lib/db/src/schema/cognitive_artifacts.ts` — Drizzle table definition
- `artifacts/api-server/src/lib/cognitive-foundation/cognitive-memory.ts` — store, pipeline, retrieval
- `artifacts/api-server/src/lib/executive-brain/index.ts` — calls `consolidate()` fire-and-forget after reasoning pipeline
- `artifacts/api-server/src/routes/executive-brain.ts` — reasoning/records now DB-backed with ring-buffer fallback; +2 new endpoints

## New API endpoints (Build 004)
- `GET /api/executive-brain/reasoning/records?limit&confidence&lifecycle&from&to` — DB-backed, falls back to ring buffer
- `GET /api/executive-brain/reasoning/records/:id` — DB first, ring buffer fallback
- `GET /api/executive-brain/reasoning/similar?objective=&limit=` — findSimilarDecisions
- `GET /api/executive-brain/reasoning/memory/summary` — totalDecisions, confidenceBreakdown, uniqueBrainCombinations

## Extension point count
21 (unchanged — new consolidation hooks are registered at runtime, not declared as extension-point-registry seams)
