---
name: Launch Hardening Framework
description: Build 045A — converts the 43-finding Principal Architect Audit into a structured engineering registry; 6 tables, 8 EPs, 334 cumulative EPs; tracks finding status, remediation plans, verification, regression risk, and launch confidence.
---

## Core facts

- **6 tables**: `launch_findings` (audit-immutable), `launch_hardening_registry` (mutable), `launch_remediation`, `launch_verification`, `launch_regression`, `launch_snapshots`
- **14 indexes** added on FK and filter columns — first late-build schema with proper index coverage
- **8 EPs** → **334 cumulative** (EXPECTED_EP_COUNT in certification/types.ts updated to 334)
- **Routes**: `/api/launch-hardening` — 3 POST (import-audit/verify/recalculate) + 6 GET (findings/blockers/registry/regressions/snapshots/status)
- **EB**: Passive — `fetchHardeningView()` reads latest snapshot; NO fire-and-forget (hardening runs are intentional build actions, not background cycles)
- **Main run fn**: `runHardeningImport(triggerBuild?)` in `launch-hardening/lh-orchestrator.ts` — idempotent, safe to call on every build

## The 43 seeded findings

4 Critical (C-01..C-04) + 10 High (H-01..H-09 + A-01) + 16 Medium (M-01..M-14 + A-02..A-03) + 9 Low (L-01..L-08 + A-04).

All live in `AUDIT_FINDINGS` array in `launch-hardening/types.ts`. NEVER modify existing entries — the audit is immutable. Append only.

## Priority algorithm

- critical + fixBeforeLaunch → BLOCKER
- critical + !fixBeforeLaunch → PRE_LAUNCH
- high + fixBeforeLaunch → PRE_LAUNCH
- high + !fixBeforeLaunch → POST_LAUNCH
- medium + fixBeforeLaunch → PRE_LAUNCH
- medium + !fixBeforeLaunch → POST_LAUNCH
- low + fixBeforeLaunch → POST_LAUNCH
- low + !fixBeforeLaunch → OBSERVATION

## Launch status ladder

NOT_READY → CONDITIONAL → READY → LAUNCH_AUTHORIZED

- NOT_READY: any BLOCKER open
- CONDITIONAL: no blockers, PRE_LAUNCH items remain
- READY: all PRE_LAUNCH resolved
- LAUNCH_AUTHORIZED: confidence = 100%

## DEPENDENCY_MAP (explicit remediation ordering)

Defined in types.ts. Key = code that depends on values:
- A-01 depends on C-02 (fix EB fatal paths before parallelizing LLM calls)
- H-03 depends on A-01 (token budget after LLM optimization)
- H-02 depends on H-01 (bigserial migration same session as index work)
- M-01 depends on C-02 + A-01 (EB waterfall after critical path fixes)
- M-13 depends on C-02 (fire-and-forget error handling alongside fatal path work)
- L-08 depends on M-04 (EP init test after input validation hardening)

## Launch Hardening Law

"No production remediation shall occur without: recorded finding + approved remediation plan + verification + regression review + updated launch readiness status."

## CRITICAL: Logger import pattern

Use `import { logger } from "../logger"` (named import), NOT `import logger from "../logger"` (default import). Default import does not exist — causes TS2613 at typecheck.

## CRITICAL: EXPECTED_EP_COUNT is now 334

File: `artifacts/api-server/src/lib/certification/types.ts` line 132. Update this constant whenever a new build adds EPs. It is a MINIMUM floor (>= check), not an exact match.

**Why:** The cert framework uses >= so new EPs don't fail the check, but the constant must be updated to ensure new builds are verified and the constant stays meaningful documentation.
