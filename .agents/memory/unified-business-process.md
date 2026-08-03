---
name: Unified Business Process Engine
description: Build 055 — UBPE; 10 tables, 8 EPs, total 414 EPs; 16 process domains; process_registry only mutable; 8 rule types share one table; optimization on-demand; UBPE_THROTTLE_CYCLES=410; Unified Business Process Law.
---

# Unified Business Process Engine (UBPE) — Build 055

**Why:** Every future application (Commerce, CRM, Marketing, HR, Finance, Support) must execute against one canonical process layer rather than building its own workflow model. UBPE is the foundational process engine — not a task manager.

## Key Numbers
- 10 tables: `business_processes`, `process_stages`, `process_steps`, `process_rules`, `process_dependencies`, `process_templates`, `process_registry`, `process_snapshots`, `process_metrics`, `process_diagnostics`
- 8 extension points declared by `declareUBPEExtensionPoints()`
- Cumulative EPs after this build: **414**
- `UBPE_THROTTLE_CYCLES = 410` (EB fires maintenance every 410 cycles)
- Route prefix: `/api/processes/*` (13 endpoints)

## Mutable Table
`process_registry` — UNIQUE on `process_id`; all other tables are append-only.

## Process Domains (16)
`sales`, `marketing`, `customer_success`, `support`, `finance`, `accounting`, `human_resources`, `operations`, `fulfillment`, `procurement`, `compliance`, `legal`, `it`, `ai_operations`, `administration`, plus `future_domain`.

## Platform Templates (8 seeded)
`tmpl_sales_onboarding`, `tmpl_sales_deal_pipeline`, `tmpl_hr_employee_onboard`, `tmpl_support_ticket`, `tmpl_finance_invoice`, `tmpl_ops_sop`, `tmpl_compliance_audit`, `tmpl_marketing_campaign`.

## Architecture Notes
- **Approval gates are a rule_type in process_rules** — same table handles SLA policies, escalations, decision branches, business rules. No separate approvals table.
- **Stage advancement appends a new row** — history is immutable; registry carries live stage counts.
- **Optimization is on-demand** — call `computeProcessMetrics(processId, userId)` or `GET /processes/metrics?recompute=true`; it writes metrics + auto-emits HIGH-impact diagnostics.
- **Critical path** — `getCriticalPath(processId)` returns `is_critical_path=true` dependency edges.
- **Registry updates are atomic** — every engine (stage advance, dependency create, step create) updates the registry in the same operation.

## How to Apply
- Create process: `POST /api/processes` → auto-initializes registry row
- Add stage: `POST /api/processes/stages` with stage definition
- Advance stage: `POST /api/processes/stages` with `{advanceStageId, status, blockedReason?}`
- Add rule: `POST /api/processes/rules` with `ruleType: "approval_gate"` for approval gates
- Get optimization: `GET /api/processes/metrics?processId=X&recompute=true`
- Get bottlenecks: `GET /api/processes/diagnostics?processId=X`
