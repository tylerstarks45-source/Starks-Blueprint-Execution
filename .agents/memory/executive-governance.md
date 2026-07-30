---
name: Executive Governance & Adaptation Engine
description: Build 014 — 9 tables, 8 EPs, 86 total EPs at boot. Principles → Policies → Profiles → Adaptation. Constitutional layer. Only APPROVED policies reach EB.
---

## Rule
Governance NEVER changes facts. Governance ONLY authorizes behavior through approved policies.
Adaptation NEVER creates policy. Learning NEVER changes behavior.
Every behavior change must be: explainable, versioned, auditable, reversible.

**Why:** Architectural separation prevents accumulated wisdom from directly modifying executive cognition without deliberate governance. Each boundary is permanent.

**How to apply:** Always call `runGovernanceCycle({ userId })` before expecting the EB to have policy advisories. Trigger via POST /api/executive-governance/cycles or let `triggerGovernanceCycle()` in EB fire it every 25 brain cycles. Never inject draft/proposed policies into the EB advisory.

## Key files
- `lib/executive-governance/policy-evaluation.ts` — 6 decision outputs (approve/reject/defer/merge/split/supersede); thresholds in `POLICY_THRESHOLDS`; confidence ≥ 0.65 for approval; `PolicyEvaluationResult` must be explicitly re-exported with `export { PolicyEvaluationResult }`
- `lib/executive-governance/policy-conflict.ts` — 6 conflict types; `runConflictScan()` deduplicates by (policyIdA::policyIdB::conflictType)
- `lib/executive-governance/behavior-profile.ts` — 5 profile types; `buildProfileAdvisory()` takes a partial profile shape
- `lib/executive-governance/adaptation-engine.ts` — `generateAdaptationPlan()` returns Omit without nullable fields — must spread + add `snapshotId:null, executedAt:null, rolledBackAt:null, governanceReportId:null` before calling `savePlan()`
- `lib/executive-governance/governance-orchestrator.ts` — 11-step cycle; reads validated principles from Learning Engine via `getValidatedPrinciples()`
- `lib/executive-governance/governance-registry.ts` — all DB persistence; `getGovernanceSummary()` for EB bridge
- `lib/executive-brain/governance-integration.ts` — EB bridge; `triggerGovernanceCycle()` throttled at 1 per 25 cycles
- Routes: `/api/executive-governance/` (20 endpoints)

## DB tables (9)
`executive_policies`, `policy_versions`, `policy_decisions`, `policy_conflicts`, `behavior_profiles`, `behavior_snapshots`, `adaptation_plans`, `governance_reports`, `governance_metrics`

## buildContextNote is now async
`buildContextNote()` became `async function buildContextNote()` in Build 014 because `buildGovernanceAdvisory()` needs to read approved policies from DB. The call site uses `await buildContextNote(...)`.

## Policy status lifecycle
draft → proposed → approved → rejected → retired (never deleted; versions in policy_versions)

## Active profile rule
Only ONE profile can be `is_active = true` per user at a time. `activateProfile()` deactivates all others before activating the new one.

## Rollback rule
Rollback restores previous snapshot state WITHOUT modifying history. The snapshot's `activePolicyIds` is restored to the profile; no rows are deleted.

## Extension points (8)
policy-proposed, policy-approved, policy-rejected, policy-conflict-detected, behavior-profile-activated, adaptation-plan-executed, behavior-snapshot-created, governance-report-produced
