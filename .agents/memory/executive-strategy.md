---
name: Executive Strategy Engine
description: Build 020 architecture — 8 tables, 8 EPs, 134 total EPs; transforms executive decisions into coherent long-term strategies; defines direction only (never plans, never executes); EB integration at 80-cycle throttle.
---

## Rule
Executive Strategy transforms the primary executive decision (from Decision Intelligence) into a coherent long-term strategic framework: pillars, objectives, dependencies, constraints, alignment, and evaluation. It defines direction ONLY.

**Why:** Permanent architectural separation — Decision selects, Strategy defines direction, Planning creates execution plans, Execution performs work. These responsibilities must never overlap.

## Key numbers
- 8 new tables: `strategy_reports`, `executive_strategies`, `strategic_pillars`, `strategic_objectives`, `strategic_dependencies`, `strategic_constraints`, `strategy_snapshots`, `strategy_registry`
- 8 EPs: `strategy-formed`, `strategy-pillar-defined`, `strategy-objective-defined`, `strategy-dependency-identified`, `strategy-constraint-evaluated`, `strategy-alignment-measured`, `strategy-evaluated`, `strategy-report-generated`
- Cumulative: 134 extension points at boot

## EB integration
- `strategy-integration.ts` — bridge (fetchStrategySummary, triggerStrategyRun, buildStrategyAdvisory)
- Throttle: every 80 EB brain cycles (constant `STRATEGY_RUN_EVERY_N_CYCLES = 80`)
- Advisory clipped to 600 chars in `buildContextNote`
- `strategySummary?: StrategySummary` added to `ExecutiveBrainResult`
- `businessesTable.ownerId` (not `userId`) for primary business lookup — consistent with Build 019

## FK insertion order (strictly enforced)
`strategy_reports` → `executive_strategies` → `strategic_pillars` → `strategic_objectives` → `strategic_dependencies` → `strategic_constraints` → `strategy_snapshots` → `strategy_registry`

## Prerequisite chain for REST
Business → `/analyze` (016) → `/discover` (017) → `/simulate` (018) → `/decide` (019) → `/strategise` (020). Returns 422 if no primary decision found.

## 9 Strategic Pillar Types
revenue_growth, operational_excellence, customer_experience, innovation, technology, market_expansion, talent, financial_strength, governance

## Each strategy gets 5–6 pillars (scenario-type ordered) + 2 objectives per pillar (outcome-oriented, NEVER task-oriented)

## 5 Dependency Types + 6 Constraint Types
Dependencies: cross_functional, business, technology, financial, people
Constraints: budget, capacity, technology, governance, legal, time

## 6 Alignment Dimensions
business_vision, mission, goals, executive_decisions, business_health, opportunity_portfolio

## 6 Evaluation Scoring Dimensions
completeness, alignment, risk, business_value, sustainability, confidence

## How to apply
- To add a new scenario type: add a `StrategyFrame` entry to `strategy-formation-engine.ts`, add pillar priority ordering to `SCENARIO_PILLAR_PRIORITIES` in `strategic-pillar-engine.ts`, and add a row to `ALIGNMENT_TABLE` in `strategic-alignment-engine.ts`.
- To add a new pillar type: add to `PillarType` union, `PILLAR_SPECS`, `ALL_PILLAR_TYPES`, and `PILLAR_OBJECTIVES` in objective engine. Also add DB row for the new pillar_type text value.
