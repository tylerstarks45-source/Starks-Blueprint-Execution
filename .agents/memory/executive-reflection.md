---
name: Executive Reflection Engine
description: Build 012 — Executive Cases + Reflection Reports; 8 tables, 8 EPs, 70 total EPs at boot.
---

## Rule
Reflection NEVER changes plans, goals, executions, or memory. Reflection ONLY explains completed Executive Cases. Reports are immutable once produced. Cases are immutable after closure.

**Why:** Separating explanation from learning prevents hindsight bias from contaminating the cognitive state. Learning (Build 013) must consume Cases, not raw observations or live state.

**How to apply:** Open a case with `openCase()`, close it with `closeCase()`, then call `reflectOnCase()` to produce the report. The Executive Brain auto-opens cases via `ensureCaseForCycle()` (fire-and-forget). Never re-use a closed case.

## Key files
- `lib/executive-reflection/reflection-orchestrator.ts` — 9-step reflect pipeline
- `lib/executive-reflection/case-assembly.ts` — deterministic case construction, pure
- `lib/executive-reflection/decision-reconstruction.ts` — timeline from recorded history only, no inference
- `lib/executive-reflection/causal-analysis.ts` — 6 pattern-based causal detectors, pure
- `lib/executive-reflection/factor-engine.ts` — 9-category factor detection, pure
- `lib/executive-reflection/quality-assessment.ts` — 8-dimension scoring, pure (`QualityScoreResult.dimension` not `.scoreDimension`)
- `lib/executive-reflection/report-engine.ts` — report draft assembly, pure
- `lib/executive-reflection/reflection-registry.ts` — all DB persistence
- Routes: `/api/executive-reflection/` (16 endpoints)

## Quality dimensions (8)
decision_quality, planning_quality, execution_quality, consistency, goal_alignment, strategic_alignment, resource_efficiency, evidence_quality

## Extension points (8)
reflection-case-opened, reflection-case-closed, reflection-started, reflection-report-produced, reflection-causal-link-identified, reflection-quality-threshold-breached, reflection-learning-ready, reflection-factor-identified

## Gotcha
`QualityScoreResult` uses `.dimension` (not `.scoreDimension`). The DB column is `score_dimension` but the TS interface field is `dimension`.
