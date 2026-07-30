---
name: Executive Principle Learning Engine
description: Build 013 — 9 tables, 8 EPs, 78 total EPs at boot. Pattern discovery → Principle extraction → Validation → Graph. Only VALIDATED principles reach EB.
---

## Rule
Learning NEVER changes behavior, planning, goals, judgment, or execution. Learning ONLY discovers Executive Principles from Reflection Reports + Executive Cases. Adaptation (Build 014) owns behavioral change.

**Why:** Architectural separation prevents hindsight bias from contaminating live cognitive state.

**How to apply:** Call `runLearningCycle({ userId })` explicitly (API: POST /api/executive-learning/cycles) or let `triggerLearningCycle()` in EB fire it every 20 brain cycles. Never inject draft or candidate principles into the EB advisory — only validated ones appear.

## Key files
- `lib/executive-learning/pattern-discovery.ts` — 8 deterministic detectors, pure; `DiscoveredPattern` is re-exported from `types.ts` via `pattern-discovery.ts`
- `lib/executive-learning/principle-extraction.ts` — fingerprint-based dedup; `buildPrincipleFingerprint()` for DB lookup
- `lib/executive-learning/principle-validation.ts` — thresholds: MIN_OBSERVATIONS=3, MIN_SUPPORT_RATE=0.55, MAX_CONTRADICTION_RATE=0.30, MIN_CONFIDENCE=0.50; `QualityScoreResult.dimension` field (not `.scoreDimension`)
- `lib/executive-learning/contradiction-engine.ts` — 5 detector types; severity drives confidence adjustment; `ContradictionSummary` for report
- `lib/executive-learning/principle-graph.ts` — 7 typed edge rules, BFS depth-capped at 4; `buildGraphEdges()` takes principle array, returns `EdgeSpec[]`
- `lib/executive-learning/learning-report-engine.ts` — pure assembly; immutable once persisted
- `lib/executive-learning/learning-registry.ts` — all DB persistence; `getLearningSummary()` for EB bridge
- `lib/executive-learning/learning-orchestrator.ts` — 10-step cycle pipeline
- `lib/executive-brain/learning-integration.ts` — EB bridge; `triggerLearningCycle()` throttled at 1 per 20 cycles
- Routes: `/api/executive-learning/` (18 endpoints)

## DB tables (9)
`executive_principles`, `principle_evidence`, `principle_versions`, `learning_reports`, `learning_metrics`, `principle_contradictions`, `principle_validation_hist`, `principle_categories`, `principle_relationships`

## Schema gotcha
`@workspace/db/schema` exports tables as `executiveCasesTable`, `reflectionReportsTable`, `reflectionScoresTable` — NOT the short drizzle names.

## Extension points (8)
principle-discovered, principle-validated, principle-deprecated, principle-contradiction-found, principle-confidence-updated, learning-cycle-completed, principle-graph-updated, learning-report-produced

## `ExtensionPointDefinition` shape
Only accepts `{ id, description, declaredBy }` — no `name`, `layer`, or `version` fields.

## Principle status lifecycle
draft → candidate → validated → deprecated → archived (never deleted)
