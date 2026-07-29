# 1.3 — Validation Engine

**Status:** Architecture Drafted — Draft (Volume 1 batch; pending architectural review)
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

**Template note:** This chapter follows the structure, quality bar, and Capability Contract format locked in [Chapter 1.1 — Executive Brain](./01-executive-brain.md) (see `00-INDEX.md`, "Chapter Template"). Per the project owner's 2026-07-29 workflow update, this chapter is drafted in a single pass and left in Draft status alongside the rest of Volume 1, rather than paused individually for approval. It has eleven capability contracts — a reflection of the Validation Engine's narrow, single-purpose mission (pre-execution safety and requirement gating) relative to Chapter 1's broader coordination mission, not a lighter-weight treatment.

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the Validation Engine — the subsystem that stands between a planned task and its execution, checking that every credential, integration, system requirement, file, and risk condition the task depends on is actually satisfied before the task is allowed to proceed. It documents the subsystem exactly as it exists today, defines its long-term mission, and binds every capability implied by that mission — implemented and latent alike — to an explicit Capability Contract. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter; every future-state contract below explicitly reuses or extends an existing seam in the current implementation. No implementation, code change, or refactor is proposed or performed by this chapter.

## 2. Baseline Reference

See Master X-RAY §1.6 (Validation Engine) for the summary-level as-built description. The Validation Engine is physically nested under `lib/planning-engine/validation-engine/` in the current codebase, but — consistent with how [Chapter 1.2 — Planning Engine](./02-planning-engine.md) §2 already scoped it — it is documented here as its own chapter, not as part of the Planning Engine's internals. Chapter 1.2 §3.4.4 (Validation Coordination) treats this subsystem strictly as an integration point; this chapter is the authoritative source for everything that happens inside it.

## 3. Architecture

### 3.1 Current Architecture Summary

*This section documents the Validation Engine exactly as it exists today. It is not redesigned here.*

**Entry point and control flow.** The subsystem's entry point is `runValidationEngine` in `lib/planning-engine/validation-engine/index.ts`. It accepts a `ValidationContext` (the task, `userId`, `systemInstanceId`) and runs every rule in the `ALL_VALIDATION_RULES` registry concurrently via `Promise.all`, returning a `ValidationResult` — an `ok` boolean plus an array of `ValidationIssue` objects. A single rule throwing an exception is caught and logged rather than failing the whole pass, so one broken rule cannot silently block every task in the system.

**The rule registry.** `ALL_VALIDATION_RULES`, defined in `rules/index.ts`, currently holds six rules: `credentialRule`, `integrationRule`, `apiRequirementRule`, `toolRequirementRule`, `fileRequirementRule`, and `approvalRule`. Every rule implements a single fixed interface (`ValidationRule` in `types.ts`): an `id`, a human-readable `description`, and an `evaluate(ctx): Promise<ValidationIssue[]>` method. This is a deliberately additive registry — a new rule is added by implementing the interface and appending it to the array, without touching the runner.

**What each rule checks.**
- `credential-rule.ts` — cross-references the live connector registry (`listConnectors()`) against the user's stored credentials (`userCredentialsTable`) to flag a task that depends on a connector the user hasn't configured.
- `integration-rule.ts` — uses the Platform Registry's `findPlatformMentions` (which aggregates live connectors and the `unsupported-platforms.ts` list) to flag a task that references a platform ASH does not support at all.
- `api-requirement-rule.ts` — checks system-wide environment variables (e.g. `OPENROUTER_API_KEY`) required by the task's `assignedEngine`, via a `PLATFORM_ENV_REQUIREMENTS` map.
- `tool-requirement-rule.ts` — a sanity check that a task's `assignedEngine` is one of the nine recognized execution engine types (e.g. `ai_orchestrator`, `browser_agent`).
- `file-requirement-rule.ts` — a keyword check (e.g. "the attached file") against `ashProjectMemoryTable` for a matching `file_ref` record.
- `approval-rule.ts` — the human-in-the-loop gate, described below.

**All six rules are deterministic today.** None calls an LLM; every rule relies on regex, keyword matching, or registry/table lookups. This is a materially different maturity profile from the Planning Engine and Executive Brain chapters, both of which mix AI-assisted and deterministic capabilities.

**Risk detection.** `risk-detector.ts`'s `detectRisks` function scans a task's description with regex patterns across five categories — `financial`, `destructive`, `bulk_external_communication`, and `account_security` (all rated "high"), and `irreversible_publish` (rated "medium") — returning a `DetectedRisk[]`. `highestRiskLevel` reduces this list to a single overall severity. `detectRisks` is called from exactly one place today: `approval-rule.ts`. It is a separate, independent mechanism from the Planning Engine's own LLM-derived risk score in `decision-engine.ts` (Chapter 1.2 §3.1, §3.4.5) — the two are not reconciled, a named risk carried forward from Chapter 1.2 (§3.9 item 1) rather than resolved here.

**Approval gating.** When `detectRisks` flags a task as high-risk and no matching "approved" record exists in `pendingApprovalsTable`, `approval-rule.ts` calls `createPendingApproval` (`lib/approvals.ts`), which inserts a row and triggers `notifyUser`. The rule then returns a `missing_approval` issue, which causes the task to be blocked. This is the only mechanism in the entire Planning Engine / Validation Engine boundary that produces a structured, database-backed block tied to human sign-off — the Planning Engine's own `hold`/`escalate` decision (Chapter 1.2 §3.4.5) is advisory prose by comparison, not a record in this table.

**State persistence.** The Validation Engine itself does not decide what to do with its output — that is `validation.ts`'s `validateProjectTasks` in the parent Planning Engine module, which calls `runValidationEngine` per task, and persists `status="blocked"`/`blockedReason` onto `ash_tasks` when a rule fails, or clears it back to `pending` when a previously-blocked task re-validates clean. This coordination logic is owned by, and documented in, Chapter 1.2 (§3.4.4) — this chapter documents only what happens inside `runValidationEngine` itself.

**Database interaction.** Reads: `userCredentialsTable`, `businessesTable`, `usersTable`, `pendingApprovalsTable`, `ashProjectMemoryTable`, `ashTasksTable`. Writes: `pendingApprovalsTable` (via `createPendingApproval`) — the Validation Engine itself does not write to `ashTasksTable`; that write happens one layer up, in `validation.ts`.

**Authorization.** Every check in this subsystem is scoped by the `ValidationContext`'s `userId` (for credentials) and the task's own `projectId`/`businessId` (for files and approvals) — there is no code path in this subsystem that reads another user's credentials or another project's file references.

**Existing extension points and debt.** The rule registry itself is a clean, additive extension point — confirmed, not aspirational. A `PLATFORM_ENV_REQUIREMENTS` map in `api-requirement-rule.ts` is the single central point for adding a new engine's environment-variable requirements. No rule currently calls an LLM, which means every check in this subsystem is fast and cheap, but also means genuinely ambiguous requirement language (e.g. a file reference that doesn't match the keyword pattern `file-requirement-rule.ts` looks for) can be missed entirely rather than caught with lower confidence — flagged as a named gap in §3.4.11, not resolved here.

### 3.2 Validation Engine Mission

The Validation Engine's long-term mission within the AI Business Operating System is to be the **safety gate between a plan and its execution** — the single place where "is this actually safe and possible to run right now" is answered, so no other subsystem has to reimplement that judgment. Where the Planning Engine (Chapter 1.2) decides what to do and in what order, the Validation Engine decides whether it is currently *allowed* to happen at all: whether the required credentials exist, whether the target platform is supported, whether required files are present, and whether a human needs to sign off first because the action is financially, operationally, or reputationally consequential. As ASH is trusted with more autonomous, higher-stakes actions on a user's behalf, the Validation Engine is the layer responsible for making sure that trust is never extended further than the user has actually authorized — catching a missing credential or an unapproved high-risk action before it becomes real-world harm, not after. This mission is deliberately larger than today's implementation; §3.4 binds every capability the mission implies, both already built and still latent, to an explicit contract.

### 3.3 Core Responsibilities

- **Requirement gating** — verify that every credential, supported integration, system dependency, and referenced file a task needs is actually present before execution.
- **Risk detection** — identify financially, destructively, or reputationally consequential actions before they run.
- **Human-in-the-loop enforcement** — ensure a high-risk action cannot proceed without a durable, database-backed approval record.
- **Extensibility** — let new requirement and risk categories be added without touching the runner or any existing rule.
- **Auditability of blocking decisions** — make every block traceable to a specific rule and a specific reason, not an opaque failure.
- **User and project scoping** — ensure every check is correctly isolated to its owning user, project, and business.

Each responsibility above decomposes into one or more of the eleven capabilities bound to contracts in §3.4.

### 3.4 Core Capability Contracts

Every capability implied by the mission (§3.2) is bound below to an explicit **Capability Contract**, using the field set and maturity scale fixed in Chapter 1 (§3.4) — reproduced there in full; see that chapter for the canonical L0–L5 definitions, not redefined here.

---

#### 3.4.1 Rule Orchestration & Execution — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in what rules exist, not the runner)

- **Purpose:** Run every registered validation rule against a task and return a single, unambiguous pass/fail result with reasons.
- **Authority:** Authorized to execute every rule in `ALL_VALIDATION_RULES` against a given `ValidationContext` and aggregate their issues. Not authorized to decide what happens to a task as a result — that belongs to Validation Coordination (Chapter 1.2 §3.4.4).
- **Responsibilities:** Invoke all rules concurrently; catch and log a single rule's failure without failing the whole pass; aggregate `ValidationIssue`s into one `ValidationResult`.
- **What This Capability Will Never Do:** Never let one throwing rule silently block every other rule's result; never skip a registered rule; never itself persist a task's blocked status.
- **Inputs:** A `ValidationContext` (task, `userId`, `systemInstanceId`).
- **Outputs:** A `ValidationResult` (`ok`, `ValidationIssue[]`).
- **Dependencies:** The rule registry (`rules/index.ts`).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic aggregation — a task is `ok` only if every rule returns no issues.
- **Success Criteria / KPIs:** Per-rule exception rate (a proxy for rule code quality, not task quality); total pass latency across six concurrent rules.
- **Failure Modes:** A rule that always throws would be silently neutralized (logged, not surfaced) rather than fixed — a availability-over-correctness tradeoff worth confirming during Review.
- **Fallback Strategy:** A throwing rule is treated as contributing no issues for that pass, not as an automatic block — deliberately fails open per rule, so a single buggy rule cannot halt the entire platform.
- **Security Requirements:** None beyond what each individual rule already enforces; the runner itself does not read or write user data.
- **Extension Rules:** New rules are added to `ALL_VALIDATION_RULES` without modifying this runner — this is the confirmed, working extension point.

#### 3.4.2 Credential Requirement Validation — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in coverage, not mechanism)

- **Purpose:** Prevent a task from executing when it depends on a third-party account the user hasn't actually connected.
- **Authority:** Authorized to read the connector registry and the requesting user's own stored credentials, and to flag a missing one. Not authorized to create, modify, or test a credential itself — that belongs to the Connections Hub.
- **Responsibilities:** Cross-reference a task's implied connector dependencies against `listConnectors()` and `userCredentialsTable`; emit a `missing_credential` issue when absent.
- **What This Capability Will Never Do:** Never read another user's credentials; never assume a credential exists without checking `userCredentialsTable` directly; never silently substitute a different user's or a platform-level credential for a missing per-user one.
- **Inputs:** The task's implied connector dependency; `userId`.
- **Outputs:** A `missing_credential` `ValidationIssue`, if applicable.
- **Dependencies:** `lib/connectors/registry.ts`, `userCredentialsTable`.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic lookup — a credential either exists for this user or it does not.
- **Success Criteria / KPIs:** False-positive rate (flagging a credential as missing when a valid platform-level fallback actually exists, per the Platform-Level AI Fallback pattern used elsewhere in the platform).
- **Failure Modes:** A registry/table read failure could either falsely block (safe default) or falsely pass (unsafe default) a task — confirm which is the actual current behavior during Review.
- **Fallback Strategy:** Not applicable — this is a direct table read with no external call to degrade.
- **Security Requirements:** Must only ever read the requesting user's own `userCredentialsTable` rows — no cross-user credential lookups.
- **Extension Rules:** New connector types are picked up automatically once registered in `lib/connectors/registry.ts`; this rule requires no code change per new connector.

#### 3.4.3 Platform & Integration Support Validation — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in registry coverage, not mechanism)

- **Purpose:** Prevent a task from being planned around a platform ASH genuinely cannot integrate with, rather than discovering that mid-execution.
- **Authority:** Authorized to read the Platform Registry (live connectors plus `unsupported-platforms.ts`) and flag an unsupported platform mention. Not authorized to add or remove a platform from the registry itself.
- **Responsibilities:** Run `findPlatformMentions` against the task description; emit an `unsupported_platform` issue for any match against the unsupported list.
- **What This Capability Will Never Do:** Never hardcode a platform list independent of the live Platform Registry (per the Platform Registry & Search Provider Abstraction pattern); never flag a platform as unsupported that has since been added as a live connector without re-checking the registry.
- **Inputs:** The task description text.
- **Outputs:** An `unsupported_platform` `ValidationIssue`, if applicable.
- **Dependencies:** The Platform Registry (`findPlatformMentions`, live connector list, `unsupported-platforms.ts`).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic text-matching against a registry-derived list, never a hardcoded one.
- **Success Criteria / KPIs:** Mention-detection recall (how often a genuine platform reference in free text is actually caught).
- **Failure Modes:** Free-text platform mentions that don't match the registry's known name variants could go undetected.
- **Fallback Strategy:** Not applicable — a registry read failure should be treated the same as "no known unsupported platform mentioned," a fail-open default worth confirming during Review.
- **Security Requirements:** None beyond registry read access already available to this rule.
- **Extension Rules:** New unsupported platforms are added to `unsupported-platforms.ts`; newly supported ones are removed by the same mechanism that adds a live connector — no change to this rule's own logic is required either way.

#### 3.4.4 System & Engine Requirement Validation — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in requirement-map coverage, not mechanism)

- **Purpose:** Catch a task that would fail immediately on execution because a required platform-level environment variable is missing, or because it has been assigned to an execution engine that doesn't exist.
- **Authority:** Authorized to read system-wide environment configuration presence (not values) and the task's `assignedEngine` field, and to flag either as invalid. Not authorized to set, rotate, or view the actual value of any environment variable — see the environment-secrets governance model.
- **Responsibilities:** `api-requirement-rule.ts` checks `PLATFORM_ENV_REQUIREMENTS` for the task's engine; `tool-requirement-rule.ts` checks `assignedEngine` against the nine recognized engine types.
- **What This Capability Will Never Do:** Never read or log an actual secret value, only its presence/absence; never accept an `assignedEngine` value outside the fixed recognized set.
- **Inputs:** The task's `assignedEngine`; system environment-variable presence.
- **Outputs:** `missing_system_requirement` / `invalid_engine_assignment` `ValidationIssue`s, if applicable.
- **Dependencies:** `PLATFORM_ENV_REQUIREMENTS` map; the fixed nine-engine enumeration.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic presence/membership checks.
- **Success Criteria / KPIs:** Rate of execution-time environment failures that this rule should have, but did not, catch beforehand (a proxy for map completeness).
- **Failure Modes:** `PLATFORM_ENV_REQUIREMENTS` is a hand-maintained map; a newly added engine that isn't added to this map at the same time would pass validation and then fail at execution.
- **Fallback Strategy:** Not applicable — a direct configuration-presence check with no external call to degrade.
- **Security Requirements:** Must never expose secret values through error messages or issue text — presence-only checking, enforced by convention today (verify during Review, not independently confirmed in this drafting pass).
- **Extension Rules:** A new execution engine's requirements are added to `PLATFORM_ENV_REQUIREMENTS` and the recognized-engine enumeration at the same time a new engine is introduced — this should be treated as one atomic change, per the failure mode above.

#### 3.4.5 File & Resource Requirement Validation — Capability Contract
**Current Maturity:** L2 (keyword-based) · **Target Maturity:** L3 (AI-assisted, with the keyword check retained as a fast fallback)

- **Purpose:** Catch a task that references an attached file or resource the system doesn't actually have on record, before execution fails looking for it.
- **Authority:** Authorized to read `ashProjectMemoryTable` for a matching `file_ref` record and flag its absence. Not authorized to fetch, create, or modify a file reference itself.
- **Responsibilities:** Keyword-match the task description (e.g. "the attached file") and, when matched, verify a corresponding `file_ref` exists in project memory.
- **What This Capability Will Never Do:** Never assume a file exists without checking `ashProjectMemoryTable` directly; never block a task over a false-positive keyword match without also verifying the memory record's absence.
- **Inputs:** The task description text; the project's memory records.
- **Outputs:** A `missing_file_reference` `ValidationIssue`, if applicable.
- **Dependencies:** `ashProjectMemoryTable`, the Memory Engine's Project Memory layer (Chapter 1.4 §3.4.3).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic keyword match, then a deterministic table lookup — no model call today.
- **Success Criteria / KPIs:** Recall against genuinely ambiguous file references that don't match the current keyword pattern (this is the named gap driving the target maturity below).
- **Failure Modes:** A task that references a file using phrasing outside the keyword pattern (e.g. "the spreadsheet I sent earlier") would not be checked at all — a silent miss, not a false block.
- **Fallback Strategy:** The current keyword check is itself the fallback layer an eventual AI-assisted upgrade must sit above, per Upgrade Before Replace — it must remain available as the fast path for the common, unambiguous phrasing it already catches.
- **Security Requirements:** File-reference lookups must remain scoped to the task's own project — no cross-project file matching.
- **Extension Rules:** An AI-assisted classification step (e.g. "does this task description imply a file dependency, in any phrasing") may be added above the existing keyword check as an additive layer, with the keyword check retained beneath it as the zero-cost fast path for the phrasing it already catches.

#### 3.4.6 Risk Detection — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature as a signal; growth is in aggregation with other risk signals, see §3.4.10)

- **Purpose:** Identify whether a task's description implies a financially, destructively, reputationally, or security-consequential action, independent of any other subsystem's judgment.
- **Authority:** Authorized to scan a task description for regex-matched risk patterns and return a `DetectedRisk[]` with an overall `highestRiskLevel`. Not authorized to itself gate or block a task — that is Approval Gate Enforcement's responsibility (§3.4.7).
- **Responsibilities:** Match task text against five fixed risk categories (`financial`, `destructive`, `bulk_external_communication`, `account_security`, `irreversible_publish`); compute the overall severity.
- **What This Capability Will Never Do:** Never produce a risk classification from anything other than the task's own description text; never silently expand its own category list without an explicit, documented addition; never present its regex-based result as equivalent to, or a substitute for, the Planning Engine's independent AI-derived risk score (Chapter 1.2 §3.4.5) — the two remain distinct, unreconciled signals today.
- **Inputs:** The task description text.
- **Outputs:** `DetectedRisk[]`, `highestRiskLevel`, consumed by Approval Gate Enforcement (§3.4.7).
- **Dependencies:** None beyond the task text itself.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic regex pattern matching across five fixed categories — no model call.
- **Success Criteria / KPIs:** False-negative rate (a genuinely risky task whose phrasing doesn't match any pattern) — currently unmeasured.
- **Failure Modes:** Regex patterns cannot generalize to novel phrasing of a genuinely risky action, unlike an AI-assisted classifier would.
- **Fallback Strategy:** Not applicable — this is the base signal itself, with no upstream fallback; its own limitations are the subject of §3.4.11 (target capability) rather than a fallback within this contract.
- **Security Requirements:** None beyond reading the task's own description text, already available to this rule.
- **Extension Rules:** New risk categories or patterns are added to `risk-detector.ts`'s fixed category list directly; reconciliation with the Planning Engine's independent risk signal is the explicit subject of Cross-Signal Risk Aggregation (§3.4.10), not a change to this capability itself.

#### 3.4.7 Approval Gate Enforcement — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3 (mature mechanism; growth is in what triggers it, via §3.4.10)

- **Purpose:** Guarantee that a high-risk task cannot proceed to execution without a durable, database-backed human sign-off — the platform's one structurally enforced human-in-the-loop gate.
- **Authority:** Authorized to create a `pending_approvals` row and trigger a user notification when `detectRisks` flags a task as high-risk and no approved record already exists. Not authorized to approve its own gate, resolve an approval, or bypass this check for any task class without a documented, approved exception.
- **Responsibilities:** Check for an existing "approved" record; call `createPendingApproval` (`lib/approvals.ts`) when none exists; call `notifyUser`; return a `missing_approval` issue that blocks the task.
- **What This Capability Will Never Do:** Never let a high-risk task (per §3.4.6) proceed without either an approved record or an active, freshly-created pending one; never resolve or auto-approve a `pending_approvals` row itself; never create a duplicate pending approval for a task that already has one outstanding.
- **Inputs:** `DetectedRisk[]`/`highestRiskLevel` from Risk Detection (§3.4.6); the task's existing approval state.
- **Outputs:** A `pending_approvals` row (on creation); a user notification; a `missing_approval` `ValidationIssue`.
- **Dependencies:** `lib/approvals.ts` (`createPendingApproval`), the notification system (`notifyUser`), Risk Detection (§3.4.6).
- **Events Published:** None directly observed; approval-lifecycle events, if any, belong to `lib/approvals.ts` itself, outside this chapter's direct ownership.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic — any `highestRiskLevel` of "high" (or "medium" for `irreversible_publish`) without an existing approved record triggers the gate; no model call.
- **Success Criteria / KPIs:** Time from pending-approval creation to user resolution; rate of approvals that are ultimately rejected (a proxy for how well-calibrated the risk threshold is).
- **Failure Modes:** A `createPendingApproval` or `notifyUser` failure could leave a task blocked with no visible path for the user to unblock it, if the notification itself never reaches them.
- **Fallback Strategy:** A failure to create the approval record or notify the user must still result in the task remaining blocked (`missing_approval` issue returned) — failing closed, not open, which is the deliberate, correct default for this specific capability, unlike most of this chapter's other rules.
- **Security Requirements:** Approval records must remain scoped to the originating task's own project/user; this is the platform's primary defense against an autonomous high-risk action occurring without the account owner's knowledge.
- **Extension Rules:** Any future escalation mechanism elsewhere in the platform (e.g. the Planning Engine's latent Escalation-to-Approval Coordination, Chapter 1.2 §3.4.12) must reuse this exact `pending_approvals` mechanism rather than introduce a parallel one, per that chapter's own Extension Rules and per Upgrade Before Replace.

#### 3.4.8 Blocking-State Persistence & Continuous Re-validation — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3 (mature; growth is in re-validation latency, mirroring Chapter 1.2 §3.9 item 3)

- **Purpose:** Turn a validation pass's in-memory result into durable task state, and make sure a task that was blocked for a since-resolved reason is actually re-checked, not left blocked forever.
- **Authority:** Authorized to persist `status="blocked"`/`blockedReason` onto `ash_tasks`, and to clear that status when a re-validation pass comes back clean. This capability is physically implemented in `validation.ts` in the parent Planning Engine module (see Chapter 1.2 §3.4.4, which documents the call site) but its rule-execution semantics are authoritative here.
- **Responsibilities:** Call `runValidationEngine` (§3.4.1) for every new task and every previously-blocked task on each planning pass; write the resulting block state.
- **What This Capability Will Never Do:** Never mark a task blocked without a specific `ValidationIssue` backing it; never clear a blocked task's status without an actual fresh re-validation pass coming back clean.
- **Inputs:** New and previously-blocked tasks in the current project.
- **Outputs:** `status`/`blockedReason` on `ash_tasks`, consumed by the Planning Engine's Readiness Classification (Chapter 1.2 §3.4.3).
- **Dependencies:** Rule Orchestration & Execution (§3.4.1); `ash_tasks` schema.
- **Events Published:** None.
- **Events Consumed:** None today (a target integration mirrors Chapter 1.2 §3.9 item 3's event-driven readiness question).
- **Decision Logic:** Deterministic — a task's block state exactly mirrors its most recent `ValidationResult`.
- **Success Criteria / KPIs:** Re-validation latency (how many planning passes a resolved blocker takes to clear) — the same open metric named in Chapter 1.2 §3.4.4.
- **Failure Modes:** If a re-validation call itself fails, a task's prior blocked state may persist inaccurately until the next successful pass.
- **Fallback Strategy:** A failed re-validation call should leave the task's existing status unchanged rather than falsely clearing or falsely blocking it — confirm this is the actual current behavior during Review, consistent with the same open item in Chapter 1.2 (§3.4.4).
- **Security Requirements:** Must only ever validate and update tasks within the resolved project.
- **Extension Rules:** Re-validation may move from pass-boundary to event-driven (e.g. triggered immediately when a credential is added or an approval is resolved) as an additive upgrade, without changing the underlying rule-execution semantics in §3.4.1–3.4.7.

#### 3.4.9 Rule Registry Extensibility — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; the registry pattern itself is intentionally simple)

- **Purpose:** Make adding a new validation concern a low-risk, additive change rather than a modification to shared logic.
- **Authority:** Authorized to define the fixed `ValidationRule` interface every rule must implement, and to enumerate the active rule set. Not authorized to change the runner's execution semantics (§3.4.1) as part of adding a rule.
- **Responsibilities:** Maintain `ALL_VALIDATION_RULES` as the single source of truth for which rules run; enforce the `ValidationRule` interface shape.
- **What This Capability Will Never Do:** Never allow a rule to be registered without implementing the full interface; never require a change to `index.ts`'s runner logic to add a rule.
- **Inputs:** A new rule module implementing `ValidationRule`.
- **Outputs:** An updated `ALL_VALIDATION_RULES` array.
- **Dependencies:** `types.ts` (`ValidationRule` interface).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Purely structural — TypeScript's interface contract is the only enforcement mechanism today.
- **Success Criteria / KPIs:** Time/effort to add a new rule (qualitatively low today, per this chapter's own analysis); zero required changes to the runner per new rule.
- **Failure Modes:** A rule that implements the interface but has an internal bug is caught only by Rule Orchestration's fail-open behavior (§3.4.1), not by this capability.
- **Fallback Strategy:** Not applicable — this is a compile-time/structural guarantee, not a runtime behavior with a fallback.
- **Security Requirements:** None beyond what the individual rule itself enforces.
- **Extension Rules:** This capability is itself the platform's sanctioned extension point for all future validation concerns — every new requirement or risk category in this subsystem should be added here, not by modifying the runner or an existing rule's unrelated logic.

#### 3.4.10 Cross-Signal Risk Aggregation — Capability Contract (target capability)
**Current Maturity:** L0 (the two risk signals exist independently; no reconciliation layer exists) · **Target Maturity:** L2/L3

- **Purpose:** Present a task's risk as one coherent signal instead of two independent, occasionally disagreeing ones.
- **Authority (target):** Authorized to read both this chapter's regex-based `detectRisks` output and the Planning Engine's independent AI-derived risk score (Chapter 1.2 §3.4.5) and reconcile them into a single presented risk level. Never authorized to suppress either underlying signal — only to reconcile how they are presented and acted on.
- **Responsibilities (target):** Detect disagreement between the two signals; define a reconciliation rule (e.g. take the higher of the two, or require agreement before down-grading a "high" regex hit).
- **What This Capability Will Never Do:** Never silently discard the more conservative of the two signals; never make Approval Gate Enforcement (§3.4.7) dependent on a component that could itself fail and thereby weaken the gate.
- **Inputs (target):** `DetectedRisk[]`/`highestRiskLevel` (§3.4.6); the Planning Engine's `deriveDecision` risk output (Chapter 1.2 §3.4.5).
- **Outputs (target):** A single reconciled risk presentation, consumed by both Approval Gate Enforcement (§3.4.7) and the Planning Engine's context note.
- **Dependencies (target):** Risk Detection (§3.4.6); Execution Decision Evaluation (Chapter 1.2 §3.4.5).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not designed; whether this reconciliation layer should live in this chapter, in the Planning Engine, or in a shared module neither chapter owns is the explicit open question carried over from Chapter 1.2 (§3.9 item 1) — not decided here.
- **Success Criteria / KPIs (proposed):** Reduction in cases where the two signals disagree by more than one severity level, once measured.
- **Failure Modes:** Until built, a user or downstream consumer has no way to know the two risk signals can disagree at all.
- **Fallback Strategy:** Not applicable until designed; once built, a failure to reconcile should default to the more conservative (higher) of the two underlying signals, never the less conservative one.
- **Security Requirements:** Must never weaken Approval Gate Enforcement's existing fail-closed behavior (§3.4.7) — reconciliation may only make the gate more consistent, never less strict.
- **Extension Rules:** This capability is itself the extension point; it must be built as a read/reconcile layer over the two existing signals, never a replacement for either, per Upgrade Before Replace and per Chapter 1.2 §3.9 item 1.

#### 3.4.11 AI-Assisted Ambiguous Requirement Resolution — Capability Contract (target capability)
**Current Maturity:** L0 (no AI-assisted requirement checking exists in this subsystem today) · **Target Maturity:** L3

- **Purpose:** Catch genuinely ambiguous requirement language (a file reference, a platform mention, a credential dependency) that today's deterministic keyword/regex rules miss because the phrasing doesn't match a known pattern.
- **Authority (target):** Authorized to run a model call over a task description to classify implied requirements when the deterministic rules (§3.4.2, §3.4.3, §3.4.5) find no match, and to surface a lower-confidence issue rather than a hard block. Never authorized to override a deterministic rule's own result, and never authorized to itself create a `pending_approvals` row — that remains Approval Gate Enforcement's exclusive authority (§3.4.7).
- **Responsibilities (target):** Run only when the fast, deterministic checks find nothing; classify likely-but-unconfirmed requirement dependencies; surface them as advisory issues.
- **What This Capability Will Never Do:** Never replace or run instead of the existing deterministic rules — those remain the fast, zero-cost first pass in every case; never fabricate a specific missing credential or file name not implied by the task text itself.
- **Inputs (target):** The task description text, only when no deterministic rule already found an issue for the given category.
- **Outputs (target):** Lower-confidence, advisory `ValidationIssue`s distinguishable from the deterministic rules' hard-block issues.
- **Dependencies (target):** `lib/openrouter` (`MODELS.utility`); Credential (§3.4.2), Platform (§3.4.3), and File (§3.4.5) Requirement Validation as the deterministic rules it runs alongside, never in place of.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not designed; whether an advisory issue from this capability should ever escalate to a hard block, or remain informational only, is an open question (§3.9 item 4), not decided here.
- **Success Criteria / KPIs (proposed):** Recall improvement over the deterministic-only baseline on a held-out set of ambiguously-phrased tasks, once built and measured.
- **Failure Modes:** An AI-call failure here must not affect the deterministic rules' own results in any way.
- **Fallback Strategy:** On AI-call failure, contribute no additional issues — the deterministic rules already run in parallel and are entirely unaffected, so this capability's fallback is simply "produce nothing," never a degraded block.
- **Security Requirements:** Must operate on the task description text only — no elevated read access beyond what the deterministic rules already have.
- **Extension Rules:** This capability is itself the extension point, and must be built as an additive advisory layer alongside the existing deterministic rules (§3.4.2, §3.4.3, §3.4.5), never as their replacement, per Upgrade Before Replace.

### 3.5 Inputs (Engine-level aggregate)

*The per-capability Inputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **From the Planning Engine (Chapter 1.2):** a `ValidationContext` per task — the task itself, `userId`, `systemInstanceId` — via Validation Coordination (Chapter 1.2 §3.4.4).
- **Persisted state read at validation time:** `userCredentialsTable`, `pendingApprovalsTable`, `ashProjectMemoryTable`, the live connector registry, and the Platform Registry's unsupported-platform list.
- **System configuration:** environment-variable presence via `PLATFORM_ENV_REQUIREMENTS`.

### 3.6 Outputs (Engine-level aggregate)

*The per-capability Outputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **`ValidationResult`** (`ok`, `ValidationIssue[]`) — returned to `validation.ts` (Chapter 1.2 §3.4.4), which is the only consumer of this subsystem's direct return value.
- **Persisted state writes:** `pendingApprovalsTable` rows (via `createPendingApproval`), the only write this subsystem performs directly; `ash_tasks` block-state writes happen one layer up, in the Planning Engine.
- **Side effects:** user notifications (`notifyUser`) on new pending approvals.

### 3.7 Integration Map

| Subsystem | Direction | Nature of the integration |
|---|---|---|
| Planning Engine (Chapter 1.2) | Planning Engine → Validation Engine | `validateProjectTasks` calls `runValidationEngine` per task; the Planning Engine persists the resulting block state and treats this entire subsystem as an integration point. |
| Connections Hub / Connector Registry | Validation Engine → Registry | `credential-rule.ts` reads `listConnectors()` live; no hardcoded connector list exists in this subsystem. |
| Platform Registry | Validation Engine → Registry | `integration-rule.ts` reads the live, connector-derived platform list plus `unsupported-platforms.ts`. |
| Memory Engine — Project Memory (Chapter 1.4 §3.4.3) | Validation Engine → Memory Engine | `file-requirement-rule.ts` reads `ashProjectMemoryTable` for `file_ref` records. |
| `lib/approvals.ts` | Validation Engine → Approvals | `approval-rule.ts` calls `createPendingApproval`; approval lifecycle management itself is owned outside this chapter. |
| Notification system | Validation Engine → Notifications | `notifyUser` called on new pending approvals. |
| Planning Engine — Execution Decision Evaluation (Chapter 1.2 §3.4.5) | Two independent signals, not integrated today | `detectRisks` (§3.4.6) and `deriveDecision`'s risk score are computed independently with no reconciliation — the named subject of Cross-Signal Risk Aggregation (§3.4.10). |
| Environment-secrets governance | Validation Engine → Configuration (read-only) | `api-requirement-rule.ts` checks environment-variable *presence* only, never values. |

### 3.8 Future Growth

The following extension points would allow the Validation Engine to grow toward the mission in §3.2 without redesigning its current rule-registry architecture, consistent with the Upgrade Before Replace law. This list is superseded in detail by each capability contract's own Extension Rules field in §3.4; it is retained here as a single cross-cutting summary.

- **Cross-Signal Risk Aggregation** (§3.4.10): a pure read-and-reconcile layer over the two already-existing risk signals — no new detection logic required, and the same reconciliation question Chapter 1.2 already raised (§3.9 item 1).
- **AI-Assisted Ambiguous Requirement Resolution** (§3.4.11): an additive advisory layer alongside the existing deterministic rules, never a replacement for the fast, zero-cost first pass they already provide.
- **Event-driven re-validation** (§3.4.8): moving blocking-state clearance from pass-boundary to event-driven, mirroring the same open question already raised for the Planning Engine's readiness classification (Chapter 1.2 §3.9 item 3).
- **`PLATFORM_ENV_REQUIREMENTS` map discipline** (§3.4.4): treating a new engine's requirement entry as part of the same atomic change that introduces the engine, closing the named failure mode.

### 3.9 Open Architecture Questions

The following require review and a decision before any related implementation work proceeds — they are flagged here, not resolved:

1. Should Cross-Signal Risk Aggregation (§3.4.10) live in this chapter, in the Planning Engine (Chapter 1.2), or in a shared module neither chapter owns — the same question Chapter 1.2 raised from its own side (§3.9 item 1)?
2. Is the current fail-open default for a throwing rule (§3.4.1) — logging and continuing rather than blocking — the correct safety posture, or should certain rule categories (e.g. Approval Gate Enforcement) fail closed instead if they cannot execute at all?
3. Should `credential-rule.ts` (§3.4.2) account for platform-level AI fallbacks (per the Platform-Level AI Fallback pattern used elsewhere) before flagging a credential as missing, to avoid false-positive blocks on features that don't actually require a per-user key?
4. Should AI-Assisted Ambiguous Requirement Resolution's (§3.4.11) advisory issues ever be capable of escalating to a hard block, or should they remain permanently informational-only?
5. Is presence-only environment-variable checking (§3.4.4) sufficient, or should this rule be extended to verify a credential actually *works* (e.g. a live connectivity test), moving it closer in spirit to the Connections Hub's own test-credential endpoints?
6. Should re-validation latency (§3.4.8) be addressed by this chapter, the Planning Engine chapter, or jointly — given that the underlying data (blocked tasks) and the underlying trigger (a resolved dependency) sit in different chapters?
7. Do `pendingApprovalsTable` rows fall under the Business Intelligence Governance / Data Access Layer's ownership and audit contract (Phase A, per the same open question already raised in Chapters 1.1 and 1.2), given that an approval record is itself a highly sensitive, ownership-critical artifact?
8. Should the fixed five-category risk taxonomy in `risk-detector.ts` (§3.4.6) be extended with new categories as ASH gains new autonomous capabilities, and if so, who owns deciding when a new category is warranted?

### 3.10 Architecture Summary

*This section closes out the Architecture stage of this chapter's lifecycle. It consolidates the chapter's own findings; it does not introduce new architecture beyond what §3.1–3.9 already establish.*

**Current maturity assessment.** Of the eleven capabilities bound to contracts in §3.4, nine are implemented today, all at L2 (Rule Orchestration & Execution, Credential/Platform/System/File Requirement Validation, Risk Detection, Approval Gate Enforcement, Blocking-State Persistence & Continuous Re-validation, Rule Registry Extensibility) — a notably flatter maturity profile than either Chapter 1.1 or 1.2, reflecting a subsystem that is deliberately, entirely deterministic today. Two capabilities are entirely latent (Cross-Signal Risk Aggregation and AI-Assisted Ambiguous Requirement Resolution, both L0). None has yet reached L3 within this chapter's own boundary (the target maturities in §3.4.5, §3.4.10, and §3.4.11 are all forward-looking). In short: the Validation Engine today reliably blocks a task on any requirement or risk condition its deterministic rules can recognize by pattern, and reliably enforces human sign-off on any risk its regex categories catch; the mission in §3.2 additionally requires it to catch requirements and risks that don't match a known pattern, and to present risk as one coherent signal rather than two independent ones.

| Maturity band | Capabilities |
|---|---|
| L2 (deterministic, implemented) | Rule Orchestration & Execution, Credential Requirement Validation, Platform & Integration Support Validation, System & Engine Requirement Validation, File & Resource Requirement Validation, Risk Detection, Approval Gate Enforcement, Blocking-State Persistence & Continuous Re-validation, Rule Registry Extensibility |
| L0 (absent) | Cross-Signal Risk Aggregation, AI-Assisted Ambiguous Requirement Resolution |

**Deferred architectural decisions.** All eight items in §3.9 are formally deferred pending the project owner's review; none has been decided in this chapter. Item #1 is the highest-leverage item, since it is the same open reconciliation question already raised from the Planning Engine's side (Chapter 1.2 §3.9 item 1) — resolving it once, in one place, closes an open question in two chapters simultaneously.

**Risks.**
- **Unreconciled risk signals** (§3.1, §3.4.6, §3.4.10): this chapter's regex-based risk detection and the Planning Engine's independent AI-derived risk score can disagree, with no aggregation layer today — the same risk named from the other side in Chapter 1.2.
- **Pattern-matching blind spots**: every deterministic rule in this chapter (§3.4.2–3.4.6) can only catch what its keyword/regex pattern anticipates; genuinely novel phrasing of a real requirement or risk passes through undetected, not merely under-scored.
- **Hand-maintained requirement map drift** (§3.4.4): `PLATFORM_ENV_REQUIREMENTS` must be updated in lockstep with new engine types, with no automated check enforcing that today.
- **Approval-record governance gap** (§3.9 item 7): `pendingApprovalsTable`, arguably the platform's single most safety-critical table, sits outside the Business Intelligence Governance / Data Access Layer (Phase A) alongside the other `ash_*` tables already named in Chapters 1.1 and 1.2.

**Future roadmap** *(sequencing only; no phase is authorized by this chapter)*:
- **Near-term candidate:** resolve §3.9 item 1 and build Cross-Signal Risk Aggregation (§3.4.10) — the same near-term candidate already named from the Planning Engine's side (Chapter 1.2 §3.10), now doubly motivated.
- **Near-term candidate:** audit `pendingApprovalsTable` and this chapter's other tables for inclusion in the Phase A governance model (§3.9 item 7), given their safety-critical nature.
- **Mid-term candidate:** build AI-Assisted Ambiguous Requirement Resolution's (§3.4.11) advisory layer, starting with the file-requirement gap named in §3.4.5 as the narrowest, lowest-risk pilot.
- **Ongoing, not phase-gated:** tightening the `PLATFORM_ENV_REQUIREMENTS` maintenance discipline (§3.4.4) can proceed independently of the above sequencing.

**Chapter approval checklist.** For the project owner's use in deciding whether to move this chapter to the Architecture Review stage:
- [ ] The mission statement (§3.2) is confirmed as an accurate statement of long-term intent for the Validation Engine.
- [ ] All eleven Capability Contracts (§3.4) have been read, and their Authority/Never-Do boundaries are confirmed correct.
- [ ] The chapter boundary with the Planning Engine (Chapter 1.2) — this chapter owning rule internals, Chapter 1.2 owning coordination — is confirmed correct.
- [ ] The eight Open Architecture Questions (§3.9) each have either a decision or an explicit "defer to a later chapter/cycle" disposition.
- [ ] The unreconciled risk-detection mechanism (§3.4.6, §3.4.10, shared with Chapter 1.2) is acknowledged as a named cross-chapter risk, with a disposition recorded.
- [ ] The Future Roadmap sequencing (above) is confirmed as a reasonable order, or reordered by the project owner.
- [ ] No implementation, refactor, or code change has occurred as part of this chapter — confirmed.
- [ ] The chapter is approved to proceed to Stage 2 (Architecture Review), or returned with specific requested changes.

## 4. Architecture Review
_Reviewer notes, open questions, and requested changes go here once a draft exists._

## 5. Approval
_Approval record: who approved, when, and any conditions attached._

## 6. Implementation Notes
_Summary of what was built and why, with references to source files — not a duplicate of the code itself._

## 7. Compliance Audit
_Verification that the implementation matches the approved architecture._

## 8. Gap Remediation
_Log of gaps found during audit and how each was closed._

## 9. Final Audit
_Sign-off confirming all gaps are remediated and the implementation matches its approved architecture._

## 10. Optimization
_Performance, security, and UX refinements made after functional completion._

## 11. Lock Record
_Date locked, locked by, and confirmation that further changes require a new revision cycle rather than an in-place edit._
