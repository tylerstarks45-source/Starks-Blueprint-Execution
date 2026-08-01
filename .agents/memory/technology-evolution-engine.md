---
name: Technology Evolution Intelligence Engine
description: Build 035 — models how technologies change over time (lifecycle, trends, velocity, adoption, future outlook). Never installs or upgrades anything.
---

## Core rule
Pure observation engine. Never installs, upgrades, or modifies platform state.

## Tables (9)
`technology_lifecycle` (upsert by technologyKey), `technology_trends` (append-only), `technology_velocity` (append-only), `technology_adoption` (append-only), `technology_outlook` (append-only), `technology_evolution_registry` (upsert — one row per tech, summary scores), `technology_evolution_snapshots` (append-only platform snapshot), `technology_recommendations_history` (append-only), `technology_change_events` (append-only event log).

## Extension points (8)
`tei.lifecycle.analysis`, `tei.trend.analysis`, `tei.velocity.analysis`, `tei.adoption.analysis`, `tei.outlook.analysis`, `tei.recommendations.generation`, `tei.evolution.orchestration`, `tei.evolution.advisory`

## Key identifiers
- EB summary type: `TechnologyEvolutionSummary`
- Fetch fn: `fetchTechnologyEvolutionSummary`; trigger fn: `triggerTechnologyEvolutionRebuild`; advisory fn: `buildTechnologyEvolutionAdvisory`
- Routes: `/api/technology-evolution` (10 endpoints, all admin-only)
- EB throttle: 230 cycles

## Cumulative EP count: 254

**Why:** Tracks technology ageing patterns — deprecation candidates, emerging tech, upgrade urgency — independent of the relationship graph (Build 034).

**How to apply:** When adding new tech-health or lifecycle features, extend the catalog arrays in the six engine files; the orchestrator picks them up automatically on next rebuild trigger.
