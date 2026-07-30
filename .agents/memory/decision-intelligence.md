---
name: Decision Intelligence Engine
description: Build 019 architecture — 8 tables, 8 EPs, 126 total EPs; evaluates simulated futures and selects the best executive decision; first layer authorized to make decisions; EB integration at 70-cycle throttle.
---

## Rule
Decision Intelligence evaluates all simulated futures and produces a justified executive decision. It is the **first layer authorized to make executive decisions**. It NEVER plans, NEVER executes, NEVER modifies simulation data.

**Why:** Strict separation between Simulation (explores futures) and Decision (chooses among them). This boundary is permanent per Chief Architect Note.

## Key numbers
- 8 new tables: `decision_reports`, `executive_decisions`, `decision_rationales`, `decision_matrices`, `decision_tradeoffs`, `decision_confidence`, `decision_snapshots`, `decision_registry`
- 8 EPs: `decision-scenario-compared`, `decision-matrix-computed`, `decision-alignment-scored`, `decision-tradeoff-analyzed`, `decision-confidence-computed`, `decision-selected`, `decision-report-generated`, `decision-registry-updated`
- Cumulative: 126 extension points at boot

## EB integration
- `decision-integration.ts` — bridge (fetchDecisionSummary, triggerDecisionRun, buildDecisionAdvisory)
- Throttle: every 70 EB brain cycles (constant `DECISION_RUN_EVERY_N_CYCLES = 70`)
- Advisory clipped to 600 chars in `buildContextNote`
- `decisionSummary?: DecisionSummary` added to `ExecutiveBrainResult`

## businessesTable FK gotcha
`businessesTable` uses `ownerId` (not `userId`) for the owner foreign key. The decision-integration bridge uses `eq(businessesTable.ownerId, userId)`. Any future EB bridge that looks up the primary business must do the same.

## FK insertion order (strictly enforced)
`decision_reports` → `executive_decisions` → `decision_rationales`, `decision_tradeoffs`, `decision_confidence` → `decision_matrices` (references reportId only) → `decision_snapshots` → `decision_registry`

## Prerequisite chain for REST
Business → `/analyze` (016) → `/discover` (017) → `/simulate` (018) → `/decide` (019). Returns 422 with clear message if prior layer has no data.

## Decision type partition
- `primary` — rank 1, highest composite selection score, governance compliant
- `alternative` — above rejection threshold (0.30), governance compliant, outranked
- `rejected` — governance non-compliant OR composite score < 0.30

## 7 Matrix Criteria weights (must sum to ~1.0)
business_goals (0.22) → executive_policies (0.18) → governance_rules (0.16) → risk_tolerance (0.15) → resource_availability (0.13) → financial_capacity (0.10) → user_priorities (0.06)

## 7 Strategic Alignment Dimensions
revenue_growth, profitability, automation, scalability, customer_growth, operational_stability, long_term_vision

## 5 Confidence dimensions
decision_confidence, evidence_score, data_completeness, assumption_stability, policy_compliance

## How to apply
- To add a new matrix criterion: extend `MatrixCriterion` in types.ts, add to `MATRIX_CRITERIA` array, update `CRITERION_WEIGHTS` (must still sum to 1.0), add rows to `SCENARIO_TYPE_CRITERION_SCORES` table.
- To add a new scenario type: add to `ALIGNMENT_TABLE` in strategic-alignment-engine.ts and `SCENARIO_TYPE_CRITERION_SCORES` in decision-matrix-engine.ts.
