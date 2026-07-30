---
name: Opportunity Discovery Engine
description: Build 017 — ranked opportunity discovery from analysis reports; 7 tables, 8 EPs, 110 total EPs; no strategy, no recommendations.
---

## Rule
Opportunity Discovery identifies where measurable business value may exist. It NEVER creates strategy, plans, or executes. Only ranked opportunities supported by deterministic evidence are produced.

**Why:** Discovery and strategy are adjacent but must be architecturally distinct. Mixing them creates a feedback loop where EB could reinforce its own opportunities rather than discovering real ones.

**How to apply:** When adding new detection sources, check: does it observe an existing condition from analysis data, or does it propose a course of action? Observation → detection-engine. Action → a future strategy/simulation build.

## Tables (Build 017)
7 tables — all append-only/immutable except `opportunity_registry` (upserted):
`executive_opportunities`, `opportunity_reports`, `opportunity_evidence`, `opportunity_scores`, `opportunity_rankings`, `opportunity_snapshots`, `opportunity_registry`

## Critical FK ordering
`opportunity_evidence` has a FK on `executive_opportunities`. Must persist opportunities FIRST, then evidence. Doing them in parallel will 50% fail.

## Scoring formula (v1)
```
composite = businessImpact(0.30) + strategicValue(0.25) + estimatedReach(0.15)
           + confidence(0.20) + (1-effort)(0.05) + (1-risk)(0.05)
```
Bump `SCORING_VERSION` constant in scoring-engine.ts when this changes.

## Detection sources → categories
- bottleneck → operations/marketing/sales/automation/infrastructure
- constraint → operations/finance/automation/infrastructure/knowledge
- leverage → revenue_growth/operations/automation/infrastructure/cost_reduction
- kpi_trend → revenue_growth/knowledge/operations
- health_trend → finance/operations/revenue_growth/product/marketing/sales/knowledge
- graph_topology → knowledge/risk_reduction

## Priority groups (composite score thresholds)
- critical ≥ 0.75
- high ≥ 0.55
- medium ≥ 0.35
- low < 0.35

## EB integration
- Pipeline step after Business Analysis (Build 016).
- triggerOpportunityRun fires every 50 EB cycles (vs 40 for analysis, 30 for graph).
- Advisory clipped to 600 chars.
- `opportunityDiscoverySummary?: OpportunityDiscoverySummary` added to `ExecutiveBrainResult`.
- EB receives: top 3 opportunities, totalOpportunities, criticalCount, highCount, highestScore, highestConfidence, highestBusinessValue, topCategory.

## REST surface (10 endpoints under /api/opportunity-discovery/)
POST `.../businesses/:id/discover`, GET reports, reports/latest, opportunities, opportunities/:id/evidence, registry, snapshots, summary, top, search
