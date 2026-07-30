---
name: Strategic Planning Engine
description: Build 021 architecture — 8 tables, 8 EPs, 142 total EPs; transforms executive strategy pillars into structured programmes/initiatives/milestones; organises work only (never executes, schedules, or assigns); EB integration at 90-cycle throttle.
---

## Rule
Strategic Planning transforms executive strategy pillars into an organised strategic plan: programmes → initiatives → milestones → dependencies → sequences → readiness → evaluation. It organises work ONLY.

**Why:** Permanent architectural separation — Strategy defines direction, Planning organises work into programmes/initiatives, Operational Planning decomposes work, Execution performs work. These responsibilities must never overlap.

## Key numbers
- 8 new tables: `planning_reports`, `strategic_plans`, `strategic_programs`, `strategic_initiatives`, `planning_milestones`, `planning_dependencies`, `planning_sequences`, `planning_registry`
- 8 EPs: `planning-formed`, `planning-program-defined`, `planning-initiative-defined`, `planning-milestone-defined`, `planning-dependency-identified`, `planning-sequence-determined`, `planning-readiness-evaluated`, `planning-report-generated`
- Cumulative: 142 extension points at boot

## FK insertion order (strictly enforced)
`planning_reports` → `strategic_plans` → `strategic_programs` → `strategic_initiatives` → `planning_milestones` → `planning_dependencies` → `planning_sequences` → `planning_registry`

## EB integration
- `planning-integration.ts` — bridge (fetchPlanSummary, triggerPlanningRun, buildPlanningAdvisory)
- Throttle: every 90 EB brain cycles (constant `PLANNING_RUN_EVERY_N_CYCLES = 90`)
- Advisory clipped to 600 chars in `buildContextNote`
- `planningSummary?: PlanningSummary` added to `ExecutiveBrainResult`

## Schema export name pattern
Build 021 tables (`planningReports`, `strategicPlans`, etc.) export WITHOUT `Table` suffix.
Build 020 tables (`strategyReportsTable`, `executiveStrategiesTable`, etc.) export WITH `Table` suffix.
Always grep `lib/db/src/schema/` for exact export names before importing.

## Route params pattern
Express `req.params` is typed as `string | string[]` in this project. Always use the helper:
```ts
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
```
Then `parseInt(p(req.params.businessId), 10)`. The `?? ""` alone does NOT fix the type error.

## Prerequisite chain for REST
Business → `/analyse` (016) → `/discover` (017) → `/simulate` (018) → `/decide` (019) → `/strategise` (020) → `/plan` (021). Returns 422 if no strategy registry entry found.

## Programme-to-Pillar Mapping (1:1)
revenue_growth → revenue_program, operational_excellence → operations_program,
customer_experience → customer_program, innovation → innovation_program,
technology → technology_program, market_expansion → market_program,
talent → talent_program, financial_strength → finance_program, governance → governance_program

## Layer sequencing (permanent)
- Layer 0: governance_program, technology_program (foundation)
- Layer 1: talent_program, finance_program, operations_program (enablers)
- Layer 2: revenue_program, customer_program, market_program, innovation_program (growth)

## Milestones
Always 2 per initiative (foundation+achievement, progress+validation, etc.) by initiative type.
Milestone types: foundation, progress, achievement, validation.
Each milestone has: milestoneName, milestoneDescription, successCriteria, isCriticalPath.

## Evaluation weights
completeness(0.15) | feasibility(0.25) | alignment(0.20) | complexity/inverted(0.10) | risk/inverted(0.15) | confidence(0.15)

## Readiness dimensions (5)
resource(0.22), technology(0.20), business(0.23), financial(0.18), governance(0.17)
Readiness levels: not_ready | low | medium | high | ready

## How to apply
- To add a new programme type: add to `ProgramType` union, `PILLAR_TO_PROGRAM_TYPE`, `PROGRAM_SPECS` in formation engine, `PROGRAM_INITIATIVES` in initiative engine, and `PROGRAM_LAYER` in sequencing engine.
- To add a new dependency type: add a `DependencyTemplate` to `UNIVERSAL_DEPENDENCIES` or a type-specific entry in `TYPE_EXTRAS` in dependency engine.
