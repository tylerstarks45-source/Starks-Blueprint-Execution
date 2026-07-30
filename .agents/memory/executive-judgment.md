---
name: Executive Judgment Engine
description: Build 007 — deterministic decision-scoring engine; options derived from reasoning result, composite scoring, structured explanation, cognitive artifact consolidation.
---

## Rule
The Executive Judgment Engine scores decision options using 10 configurable dimensions, selects the highest composite-score option as the recommendation, and produces a structured explanation. No AI calls — entirely deterministic math.

**Why:** The engine's value is auditability. Every recommendation can be replayed by re-running the same options + weights. AI inference would break this.

## How to apply
- Four dimensions are inverted before weighting (lower raw = better): `risk`, `cost`, `complexity`, `resourceDemand`.
- Default weights sum to 1.0 (see `DEFAULT_SCORING_WEIGHTS` in types.ts).
- When adding new scoring dimensions in future, add to `JUDGMENT_SCORE_DIMENSIONS`, `INVERTED_DIMENSIONS` if applicable, and `DEFAULT_SCORING_WEIGHTS`. Weights must be renormalised.

## Executive Brain integration
After `runReasoningPipeline`, `evaluateJudgmentFromReasoning()` is called synchronously (fail-open). It derives 2–3 options from `ObjectiveAnalysis`:
- Always: `execute_primary_plan` (from `primaryGoal`)
- When complexity=high or unknowns≥2: `simplify_approach`
- When unknowns≥2: `defer_for_clarification`

The `judgmentId` is stored on `ExecutiveBrainResult` and surfaced in the context note advisory.

## Extension points (5, all declared at boot)
- `judgment-pre-evaluation` — inject options or enrich scores before scoring
- `judgment-post-scoring` — override scores (e.g. policy/ethical constraints)
- `judgment-pre-recommendation` — change selected key before explanation
- `judgment-explanation-generated` — enrich explanation text
- `judgment-completed` — consume for learning/feedback loops

## DB table
Single table: `executive_judgments`. JSONB for options array (always read as a unit). Aggregate scores (decision_score, confidence_score, etc.) stored as REAL columns for indexed sorting. No join table for options.

## Extension points total after Build 007
32 (27 prior + 5 new)
