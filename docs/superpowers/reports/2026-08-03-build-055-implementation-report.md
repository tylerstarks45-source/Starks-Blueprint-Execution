# Build 055 — Unified Business Process Engine (UBPE)
**Date:** 2026-08-03  
**Status:** ✅ COMPLETE  
**Cumulative Extension Points:** 414 (+8)

---

## 1. Executive Summary

Build 055 delivers the **Unified Business Process Engine (UBPE)** — the canonical representation of every repeatable business operation on the platform. Processes are now first-class business assets. Every future application (Commerce, CRM, Marketing, HR, Finance, Support, AI Workforce, Operations) will execute against UBPE rather than building independent workflow logic.

UBPE gives ASH a complete map of how work moves through every business domain — bottlenecks, blocked stages, pending approvals, SLA risk, and cross-process dependencies are all visible in a single intelligent view.

---

## 2. Files Created

| File | Description |
|------|-------------|
| `lib/db/src/schema/unified_business_process.ts` | 10 Drizzle table definitions |
| `artifacts/api-server/src/lib/unified-business-process/types.ts` | `ProcessDomain`, `ProcessType`, `StageType`, `StepType`, `RuleType`, `DependencyType`, `UBPESummary` |
| `artifacts/api-server/src/lib/unified-business-process/ubpe-extension-points.ts` | 8 extension point declarations |
| `artifacts/api-server/src/lib/unified-business-process/process-definition-engine.ts` | Immutable process definition lifecycle: create, list, search |
| `artifacts/api-server/src/lib/unified-business-process/stage-orchestration-engine.ts` | Stage create/advance + step management + registry updates |
| `artifacts/api-server/src/lib/unified-business-process/approval-engine.ts` | Rule creation, approval gate enumeration, pending approval count |
| `artifacts/api-server/src/lib/unified-business-process/dependency-engine.ts` | Process-to-process dependency edges + critical-path extraction |
| `artifacts/api-server/src/lib/unified-business-process/optimization-engine.ts` | Bottleneck detection, SLA adherence scoring, optimization opportunities, diagnostics |
| `artifacts/api-server/src/lib/unified-business-process/ubpe-orchestrator.ts` | `UBPESummary` builder, snapshot capture, maintenance |
| `artifacts/api-server/src/lib/executive-brain/ubpe-integration.ts` | `fetchUBPEView`, `triggerUBPEMaintenance`, `buildUBPEAdvisory` |
| `artifacts/api-server/src/routes/unified-business-process.ts` | 13 REST endpoints at `/api/processes/*` |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `lib/db/src/schema/index.ts` | Added `export * from "./unified_business_process"` |
| `artifacts/api-server/src/routes/index.ts` | Mounted `/api/processes` router |
| `artifacts/api-server/src/lib/cognitive-foundation/index.ts` | Imported + called `declareUBPEExtensionPoints()` |
| `artifacts/api-server/src/lib/executive-brain/index.ts` | Import, pre-warm, variable, fetch/trigger, params, destructure, call, advisory, return |
| `artifacts/api-server/src/lib/executive-brain/types.ts` | Added `ubpeSummary?` to `ExecutiveBrainResult` |
| `artifacts/api-server/src/lib/certification/types.ts` | `MINIMUM_EP_COUNT` 406 → 414 |

---

## 4. Database Schema

| Table | Type | Key Constraint |
|-------|------|----------------|
| `business_processes` | Append-only | — |
| `process_stages` | Append-only | — |
| `process_steps` | Append-only | — |
| `process_rules` | Append-only | — |
| `process_dependencies` | Append-only | — |
| `process_templates` | Append-only | — |
| `process_registry` | **Mutable** | UNIQUE on `process_id` |
| `process_snapshots` | Append-only | — |
| `process_metrics` | Append-only | — |
| `process_diagnostics` | Append-only | — |

52 SQL statements executed (10 tables + 42 indexes). 0 failures.

---

## 5. Process Model

A process is created via `POST /api/processes` and receives a stable `process_id` (prefix: `proc_`).

**16 process domains:** sales, marketing, customer_success, support, finance, accounting, human_resources, operations, fulfillment, procurement, compliance, legal, it, ai_operations, administration, plus `future_domain`.

**9 process types:** standard, approval_flow, onboarding, checklist, pipeline, workflow, sop, playbook, plus `future_type`.

Every process carries:
- `processDomain` + `processType` — what kind of operation and where it lives
- `slaHours` — total SLA budget for the entire process
- `slaStatus` — on_track | at_risk | breached | completed
- `healthScore` (0–100) — computed by the Optimization Engine
- `version` — process versioning
- `templateId` — optional link to a process template

The `process_registry` maintains the live mutable view: stage count, completed stages, completion percent, health score, SLA status, bottleneck stage ID, pending approvals, blocked stage count, dependency count.

---

## 6. Stage Model

**6 stage types:** sequential, parallel, conditional, approval, milestone, terminal.

**5 stage statuses:** pending → in_progress → (completed | blocked | skipped).

Each stage transition appends a new row to `process_stages` — the registry carries the live completion count. Stage advancement automatically:
- Increments `completed_stages` and recomputes `completion_percent` in the registry on completion
- Sets `bottleneck_stage_id` and increments `blocked_stages` on block

Steps (`process_steps`) sit inside stages. **9 step types:** action, decision, approval, notification, integration, ai_task, human_task, review, plus `future_step`. Steps carry `isBlocking` (blocks the stage until complete) and `isRequired` flags.

---

## 7. Approval Model

The Approval Engine uses `process_rules` to define approval gates and any other business rule logic.

**8 rule types:** approval_gate, decision_branch, sla_policy, escalation, validation, notification, business_rule, automation.

Rules carry:
- `triggerEvent` — stage_start | stage_complete | step_fail | sla_breach | approval_request | custom
- `conditions` — `[{field, operator, value}]` array
- `actions` — `[{actionType, payload}]` array
- `priority` — ordered evaluation (lower = first)

`getPendingApprovals(processId)` returns all active `approval_gate` rules that are awaiting resolution. `countPendingApprovals(userId)` aggregates platform-wide for the EB advisory.

---

## 8. Dependency Model

The Dependency Engine maps edges between processes using `process_dependencies`.

**7 dependency types:** must_complete_before, triggers, feeds_data_to, approval_required_by, blocks, informs, plus `future_dep`.

Each edge carries:
- `strength` (1.0 = hard block, 0.5 = soft dependency)
- `isCriticalPath` — flags edges on the critical path
- `dependencyType` — semantic meaning of the relationship

`getCriticalPath(processId)` returns all critical-path edges involving a process. Both sides of a dependency have their `dependency_count` incremented in the registry.

---

## 9. Optimization Intelligence

The Optimization Engine runs `computeProcessMetrics(processId)` on demand:

| Signal | Method | Impact |
|--------|--------|--------|
| Blocked stages | Count of `status = 'blocked'` | −15 pts per block |
| SLA breaches | Stages that ran past `sla_hours` | −10 pts per breach |
| Process complexity | >10 stages | −5 pts |
| Parallel opportunity | >50% pending stages | −5 pts |

**Optimization score** (0–100) = 100 − (bottleneck penalty + SLA penalty + complexity penalty).

**4 opportunity types:**
- `bottleneck_removal` — blocked stages (HIGH)
- `sla_improvement` — stages past budget (HIGH)
- `process_simplification` — >10 stage processes (MEDIUM)
- `parallelization` — majority-pending processes (MEDIUM)

High-impact opportunities automatically emit `process_diagnostics` rows with severity `warning`, enabling ASH to surface actionable recommendations without additional queries.

---

## 10. Executive Brain Integration

| Component | Description |
|-----------|-------------|
| Pre-warm | `fetchUBPEView()` fires concurrently with LLM round-trips |
| Throttle | `triggerUBPEMaintenance()` fires every 410 EB cycles (fire-and-forget) |
| Advisory | `buildUBPEAdvisory()` surfaces: total/active/completed process counts, blocked count, SLA breach count, pending approvals, avg health, avg completion, top domain |
| Fail-open | All EB integration calls use `.catch(() => undefined)` |

**ASH can now answer:**
- "What processes are incomplete?" → active + blocked from registry
- "What's blocking revenue?" → blocked_stages > 0, domain = sales
- "Which approvals are overdue?" → pending approval_gate rules
- "Optimize this onboarding process." → run computeProcessMetrics → surface opportunities
- "Where are my bottlenecks?" → bottleneck_stage_id + diagnostics
- "What business process should I create next?" → domain_breakdown gaps vs process templates

---

## 11. REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/processes` | auth | Create a canonical business process |
| POST | `/processes/stages` | auth | Create a stage OR advance an existing stage |
| POST | `/processes/templates` | admin | Register a reusable process template |
| POST | `/processes/rules` | auth | Create a business rule (approval gate, SLA policy, etc.) |
| GET | `/processes` | auth | List processes (filter by domain, paginated) |
| GET | `/processes/stages` | auth | List stages for a process |
| GET | `/processes/templates` | public | List templates (filter by domain) |
| GET | `/processes/dependencies` | auth | List dependency edges for a process |
| GET | `/processes/registry` | public | Registry summary + recent processes |
| GET | `/processes/metrics` | auth | Get or recompute optimization metrics |
| GET | `/processes/search` | auth | Full-text search across title + description |
| GET | `/processes/snapshots` | public | Platform snapshot history |
| GET | `/processes/diagnostics` | auth | Process health diagnostics |

---

## 12. Technical Decisions

1. **`process_registry` is the live mutable view; all source tables are append-only.** Stage advancement, step creation, dependency mapping, and metrics computation all write their history to append-only tables and update the registry row atomically. This gives O(1) current-state reads without aggregating history tables.

2. **Stage advancement appends a new row, it doesn't UPDATE.** The full transition history is preserved. Each new row represents the stage at a point in time. The registry carries the live stage count.

3. **The Approval Engine uses `process_rules`, not a separate approvals table.** Approval gates are a rule type — same engine handles SLA policies, escalations, decision branches. This avoids a fourth approval-specific table while keeping the model extensible.

4. **Optimization is on-demand, not scheduled.** `computeProcessMetrics()` is triggered by `GET /processes/metrics?recompute=true` or called by the maintenance cycle. This prevents constant background computation on large process graphs.

5. **High-impact optimization opportunities auto-emit diagnostics.** Rather than requiring a separate diagnostic-generation step, `computeProcessMetrics()` writes `process_diagnostics` rows for HIGH-impact opportunities. This means ASH receives actionable items via the diagnostics endpoint without additional processing.

---

## 13. Performance Impact

- 52 SQL statements (10 tables + 42 indexes) — no migrations required
- EB pre-warm adds one concurrent DB round-trip (parallel with LLM — negligible)
- `computeProcessMetrics()` executes one aggregate query over `process_stages` — fast at expected volumes
- Registry updates are single-row UPDATEs via `process_id` unique index — O(log n)
- `buildUBPESummary()` executes 5 parallel aggregate queries — suitable for pre-warm pattern

---

## 14. Architectural Trade-offs

**Selected:** Three-layer architecture — source tables (immutable history) + registry (live mutable) + metrics/diagnostics (computed outputs). Rules and approvals share one table keyed by `rule_type`.

**Alternative rejected:** Single mutable `processes` table with a separate `approvals` table.

**Why:** The three-layer pattern means any module can query current state from the registry without aggregating history. The rules/approvals unification means the Approval Engine, SLA Engine, Escalation Engine, and Notification Engine share one evaluation path — adding a new rule type doesn't require a new table or router.

---

## 15. Extension Points Added (8)

| ID | Description |
|----|-------------|
| `ubpe.process.created` | New business process defined in the canonical process layer |
| `ubpe.stage.progressed` | Process stage advanced or completed |
| `ubpe.rule.applied` | Business rule evaluated and applied to a process |
| `ubpe.dependency.mapped` | Process-to-process dependency edge recorded |
| `ubpe.bottleneck.detected` | Optimization engine detected a bottleneck or SLA risk |
| `ubpe.template.registered` | Reusable process template registered |
| `ubpe.snapshot.captured` | Platform-wide process intelligence snapshot recorded |
| `ubpe.maintenance.completed` | UBPE maintenance cycle completed |

---

## 16. Unified Business Process Engine Score

| Criterion | Score | Notes |
|-----------|-------|-------|
| Canonical Process Model (16 domains, 9 types) | ✅ | `business_processes` + `process_registry` |
| Stage Orchestration (6 types, 5 statuses) | ✅ | Append-only FSM, registry live view |
| Step Management (9 types) | ✅ | `process_steps` inside stages |
| Approval Framework | ✅ | `process_rules` with `approval_gate` type |
| Business Rules Engine | ✅ | 8 rule types: approval, SLA, escalation, branch, etc. |
| Dependency Graph (7 edge types, critical path) | ✅ | `process_dependencies` with BFS-ready structure |
| Optimization Intelligence | ✅ | 4 opportunity types, auto-diagnostics for HIGH impact |
| Platform Templates (8 seeded) | ✅ | sales, HR, finance, ops, compliance, marketing |
| Executive Brain Integration | ✅ | Pre-warm, advisory, fail-open |
| Backward Compatibility | ✅ | Purely additive — Builds 001–054 untouched |
| TypeCheck (DB) | ✅ | 0 errors |
| TypeCheck (API) | ✅ | 0 errors |
| Extension Points | ✅ | 414 cumulative (406 + 8) |
| Governance Law | ✅ | Unified Business Process Law enacted |
