---
name: Launch Hardening 045C
description: Build 045C completed all 18 PRE_LAUNCH findings — platform is READY. Key fixes, patterns, and governance schema for future reference.
---

## What Was Done
Build 045C resolved all 18 PRE_LAUNCH findings from the Launch Hardening audit. Platform status upgraded from CONDITIONAL → READY (confidence 0.97).

## Governance Schema Gotchas
The launch_hardening DB tables use different column names than the Drizzle schema file names suggest:
- `launch_remediation`: `plan_description` (not `remediation_plan`), `estimated_complexity` (not `estimated_effort`), `author` (not `owner`), `build_number`, `completed_at`
- `launch_verification`: `remediation_id` (FK to remediation, not finding), `verification_method`, `verification_result`, `verified_by`, `verification_notes`, `verified_at`
- `launch_regression`: `remediation_id` (FK to remediation), `finding_code`, `impacted_subsystems`, `regression_risk`, `regression_notes`, `reviewed_by`, `reviewed_at`, `approved`
- `launch_snapshots`: `prelaunching_remaining` (not `pre_launch_remaining`), `launch_status` (not `status`), `snapshot_data` (jsonb), `trigger_build`
- `launch_hardening_registry`: has `finding_code` (text) and `priority`/`status` columns — update status here for registry tracking, NOT in launch_findings

**Why:** The raw SQL table creation in 045A matched the spec document, not the Drizzle camelCase schema. Always check `information_schema.columns` before inserting.

## Key Fixes Summary
- **H-01** (77 indexes): `CREATE INDEX CONCURRENTLY IF NOT EXISTS` pattern — safe to re-run
- **H-03** (token budget): end of `buildContextNote()`, BUDGET=12000, keep 40% head + 20% tail
- **H-08** (sql.identifier): cert engines now use `sql\`SELECT 1 FROM ${sql.identifier(t)}\`` — add `import { sql } from "drizzle-orm"` 
- **A-01** (pre-warm): declare `preWarm*` promises BEFORE `resolveActiveProject()`, await them in each section with `?? undefined` for null-safety
- **A-03** (DOL expiry): scheduler key `"dol_session_expiry"`, `DOL_SESSION_EXPIRY_INTERVAL_MS = 5 * 60 * 1000`
- **M-12** (OpenAPI): paths go before `components:` block; servers.url=/api so paths are `/connections/...` not `/api/connections/...`

## Final Registry State
- BLOCKER: 4/4 verified (045B)
- PRE_LAUNCH: 18/18 verified (045C)
- POST_LAUNCH: 9 deferred
- OBSERVATION: 8 monitoring
- Launch status: READY, confidence: 0.97
- extensionPoints: 334 (confirmed at boot)
- TypeCheck: clean (0 errors)

**Why this matters:** Future builds that add extension points or tables should run tsc after schema changes and verify boot log still shows correct EP count. The MINIMUM_EP_COUNT (was EXPECTED_EP_COUNT) is the floor; certification passes if actual >= MINIMUM.
