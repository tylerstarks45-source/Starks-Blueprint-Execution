---
name: Future State Simulation Engine
description: Build 018 architecture — 8 tables, 8 EPs, 118 total EPs; transforms opportunities into deterministic future business states; EB integration at 60-cycle throttle.
---

## Rule
Simulation transforms `ExecutiveOpportunity` rows into multiple deterministic future business states. It NEVER recommends, plans, or executes. It NEVER owns EB state.

**Why:** Separation of concerns: Opportunity Discovery identifies value; Simulation explores futures; EB reasons over summaries only.

## Key numbers
- 8 new tables: `future_scenarios`, `scenario_branches`, `simulation_reports`, `simulation_assumptions`, `simulation_evidence`, `simulation_outcomes`, `simulation_snapshots`, `simulation_registry`
- 8 EPs: `simulation-scenario-generated`, `simulation-impact-estimated`, `simulation-kpi-projected`, `simulation-health-projected`, `simulation-risk-projected`, `simulation-outcome-computed`, `simulation-report-generated`, `simulation-scenario-selected`
- Cumulative: 118 extension points at boot

## EB integration
- `simulation-integration.ts` — bridge file (fetchSimulationSummary, triggerSimulationRun, buildSimulationAdvisory)
- Throttle: every 60 EB brain cycles (constant `SIMULATION_RUN_EVERY_N_CYCLES = 60`)
- Advisory clipped to 600 chars in `buildContextNote`
- `simulationSummary?: SimulationSummary` added to `ExecutiveBrainResult`

## Prerequisite chain for REST
Business must exist → `/analyze` (Build 016) → `/discover` (Build 017) → `/simulate` (Build 018). Each step 422s with a clear message if the prior layer has no data.

## Deterministic engine design
1. `scenario-generation-engine.ts` — one scenario per unique opportunity category (max 8), ordered by composite score
2. `business-impact-engine.ts` — 9-dimension impact table keyed on `ScenarioType`; `computeExpectedValueScore()` aggregates
3. `kpi-projection-engine.ts` — 6 KPI categories with expected change, direction, confidence, evidence
4. `health-projection-engine.ts` — 8 health dimensions with projected delta
5. `assumption-engine.ts` — universal (3) + type-specific (3) immutable assumptions per scenario
6. `risk-projection-engine.ts` — 6 risk types with level, description, mitigation hint, known unknowns
7. `outcome-engine.ts` — 4 outcomes (best/expected/worst/most_likely); `buildBranches()` produces `ScenarioBranch[]`
8. `simulation-report-engine.ts` — `SimulationReport` assembly + `buildSimulationSummaryForEB()` for EB advisory

## DB insert order (FK dep)
`simulation_reports` must be persisted BEFORE `future_scenarios` (FK dep). Evidence/assumptions/outcomes persisted AFTER their parent scenario row.

## How to apply
- When adding new scenario categories, extend the ScenarioType union in `types.ts`, add impact row to the 9-dimension table in `business-impact-engine.ts`, and add type-specific assumptions to `assumption-engine.ts`.
- New `getLatestHealth` fields: the orchestrator reads `financialHealth`, `operationalHealth`, `growthHealth`, `productHealth`, `marketingHealth`, `salesHealth`, `executiveHealth` as direct properties (not nested).
