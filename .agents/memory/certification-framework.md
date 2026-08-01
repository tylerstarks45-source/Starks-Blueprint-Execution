---
name: Cognitive Certification & Launch Readiness Framework
description: Build 045 (final foundational build) — deterministic platform certification; 9 tables, 8 EPs, 326 cumulative EPs; 6 engines; 21 domains; 29 architectural laws; never modifies platform state; Cognitive Certification Law enacted.
---

## Core facts

- **9 new tables**: `certification_runs`, `certification_domains`, `validation_rules`, `health_checks`, `compliance_results`, `launch_reports`, `certification_registry`, `certification_snapshots`, `administrator_signoffs`
- **8 EPs** → **326 cumulative** (confirmed in boot log)
- **Routes**: `/api/certification` — 3 POST (run/launch-report/revalidate) + 7 GET (results/domains/compliance/health/registry/snapshots/signoffs)
- **EB**: Passive — `fetchCertificationView()` reads latest snapshot; NO fire-and-forget trigger (certification is an intentional admin action, not background work)
- **Main run fn**: `runFullCertification({ runName, triggeredBy })` in `certification/cert-orchestrator.ts`

## CRITICAL: Function name corrections

**Use `listBrains()` NOT `getRegisteredBrains()`** — from `cognitive-foundation/brain-registry`
**Use `listExtensionPoints()` NOT `getRegisteredExtensionPoints()`** — from `cognitive-foundation/extension-points`
These are the correct public API names. The "get" variants do NOT exist.

**Use `b.name` NOT `b.id` to access brain identity** — RegisteredBrain has `name`, `version`, `capabilities`, not `id`.

## CRITICAL: Architectural rule

The Certification Framework NEVER modifies platform state. It reads, evaluates, and records results only in its own 9 tables. No engine, route, or integration in this framework may write to any table outside the certification schema.

## 21 Certification Domains

executive_brain, cognitive_orchestrator, knowledge_graph, authority_framework, digital_operating_layer, connections_hub, business_intelligence, technology_intelligence, infrastructure_intelligence, planning_systems, execution_systems, observation_systems, learning_systems, reflection_systems, governance, memory, security, performance, reliability, scalability, extensibility

## 29 Architectural Laws Verified

Includes all laws from Builds 001–045. Table proof (existence check) is the primary evidence. The Extension Point Completeness bonus law checks EP count ≥ 326.

## Readiness Levels

not_ready → conditional → ready → certified

Thresholds: critical issues = not_ready; warnings > 3 or score < 70 = conditional; score ≥ 90 = certified; else ready.

## Cognitive Certification Law

"No version of ASH shall be considered production-ready without successfully completing a full Cognitive Certification run." Every report must include: subsystem coverage, law compliance, dependency validation, health metrics, launch blockers, warnings, evidence, readiness score, administrator sign-off status.

## THIS IS THE FINAL FOUNDATIONAL BUILD

Build 045 completes the foundational Cognitive Operating System. Future development expands capabilities, connectors, builders, integrations, user experiences, industry modules, and autonomous workflows — not the core architecture.

**Why:** The foundational architecture (Builds 001–045) establishes the permanent cognitive framework. Rebuilding it later is expensive and creates inconsistency. The certification framework is the last piece — it validates the whole.
