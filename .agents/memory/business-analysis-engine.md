---
name: Business Analysis Engine
description: Build 016 — deterministic executive analysis layer; 8 tables, 8 EPs, 102 total EPs; purely descriptive, no recommendations.
---

## Rule
Business Analysis explains business reality. It never recommends, plans, executes, or generates opportunities. That boundary is permanent.

**Why:** Analysis and intelligence are adjacent but architecturally distinct. Mixing them would allow analysis data to be mutated by higher-level reasoning, breaking the immutability contract.

**How to apply:** When adding new analysis features, check: does it explain an observed state, or does it produce a recommendation? Explanatory → business-analysis. Prescriptive → a future build.

## Tables (Build 016)
8 append-only/immutable tables (except `analysis_registry` which is upserted):
`business_analysis_reports`, `business_findings`, `business_bottlenecks`, `business_constraints`, `business_leverage_points`, `analysis_snapshots`, `analysis_metrics`, `analysis_registry`

## Key import facts
- Graph data (nodes, edges, KPIs, health, deps, business) is read from `lib/business-graph/business-registry.ts` — NOT the analysis registry.
- `BusinessNodeType` must come from `../business-graph/types`, not from `./types`.
- `CORE_NODE_TYPES` and `EXTENDED_NODE_TYPES` must be typed as `BusinessNodeType[]` or `Set.has()` will fail TypeScript.

## Extension points (8)
analysis-opportunity-detection, analysis-scenario-analysis, analysis-forecasting, analysis-business-benchmarking, analysis-market-comparison, analysis-industry-analysis, analysis-competitive-intelligence, analysis-strategic-recommendations

## EB integration
- Pipeline step runs after Business Graph (Build 015), before context note assembly.
- triggerAnalysisRun fires every 40 brain cycles (vs 30 for graph refresh).
- Advisory clipped to 600 chars.
- `businessAnalysisSummary?: BusinessAnalysisSummary` added to `ExecutiveBrainResult`.

## REST surface
12 endpoints under `/api/business-analysis/`:
POST `.../businesses/:id/analyze`, GET `.../businesses/:id/reports`, `.../businesses/:id/reports/latest`, `.../reports/:reportId/findings`, `.../reports/:reportId/bottlenecks`, `.../reports/:reportId/constraints`, `.../reports/:reportId/leverage`, `.../reports/:reportId/snapshots`, `.../businesses/:id/registry`, `.../businesses/:id/diagnostics`, `.../businesses/:id/summary`, `.../businesses/:id/search`
