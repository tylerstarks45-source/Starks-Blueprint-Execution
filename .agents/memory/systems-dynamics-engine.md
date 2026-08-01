---
name: Systems Dynamics Intelligence Engine
description: Build 036 — models complete system behavior across 8 platform systems: feedback loops, propagation paths, constraints, leverage points, resilience. Never executes or modifies platform state.
---

## Core rule
Observation-only. Systems Thinking Law: never optimize one component without evaluating the effect on the larger system. Every recommendation must consider downstream impact, upstream dependencies, propagation effects, resilience, and long-term equilibrium.

## Tables (9, all prefixed sdi_)
`sdi_systems` (unique on system_key, append-only inserts), `sdi_subsystems`, `sdi_feedback_loops`, `sdi_propagation_paths`, `sdi_system_constraints`, `sdi_leverage_points`, `sdi_system_resilience`, `sdi_systems_registry` (upsert — one row per system, mutable), `sdi_systems_snapshots` (append-only).

## Systems catalog (8)
`business-system`, `technology-system`, `execution-system`, `intelligence-system`, `data-system`, `user-system`, `infrastructure-system`, `integration-system`

## Extension points (8)
`sdi.system.mapping`, `sdi.feedback.loop.analysis`, `sdi.propagation.analysis`, `sdi.constraint.analysis`, `sdi.leverage.analysis`, `sdi.resilience.analysis`, `sdi.evolution.orchestration`, `sdi.evolution.advisory`

## Key identifiers
- EB summary type: `SystemsDynamicsSummary`
- Fetch fn: `fetchSystemsDynamicsSummary`; trigger fn: `triggerSystemsDynamicsRebuild`; advisory fn: `buildSystemsDynamicsAdvisory`
- Routes: `/api/systems-dynamics` (10 endpoints, all admin-only)
- EB throttle: 240 cycles

## Cumulative EP count: 262

**Why:** Systems-level reasoning enables the EB to evaluate cross-system effects before recommending any change — the foundation for true executive-level decision making.

**How to apply:** When adding new platform systems or subsystems, extend the catalogs in the 6 engine files; the orchestrator picks them up automatically on next rebuild.
