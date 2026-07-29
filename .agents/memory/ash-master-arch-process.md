---
name: ASH Brain Master Architecture Specification — process and roles
description: How chapters in docs/superpowers/specs/ash-brain-master-architecture-specification/ get authored, reviewed, and approved, and what this agent's role is in that process. Read before touching any chapter file or starting any ASH build.
---

## Where this lives

- Master index: `docs/superpowers/specs/ash-brain-master-architecture-specification/00-INDEX.md` — Upgrade Before Replace law, nine-stage chapter lifecycle, volume/chapter table, and the "Chapter Template" pointer.
- Charter: `docs/superpowers/specs/ash-brain-master-architecture-specification/volume-0-governing-principles/README.md` — platform philosophy, long-term objective, roles, and the amendment log for the process itself.
- Baseline: `docs/superpowers/specs/2026-07-29-ash-brain-master-xray.md` — accepted as-built inventory; every chapter's §3.1 must ground itself in this plus fresh code reads, not assumption.

## Permanent implementation-phase workflow (established 2026-07-29 — supersedes all prior planning modes for this project)

The owner issued a permanent, explicit three-role workflow for all future ASH work:
- **Chief Software Architect** (external, e.g. ChatGPT) — designs architecture, decides what gets built and in what order, writes every build specification.
- **Product Owner** (the user) — reviews, approves, sets priorities, delivers build specs to this agent.
- **Senior Software Engineer (this agent)** — implements the build spec it is given. Nothing else.

**Why:** the owner explicitly wants a strict separation where architecture/sequencing decisions are made outside this agent; this agent's job is execution, not roadmapping.

**How to apply — hard rules, not preferences:**
- Do NOT call `EnterPlanMode`, create project tasks, propose roadmaps, invent a "Build #N", or suggest what to build next for this project, even when a natural next step is obvious from the architecture docs.
- Do NOT stop work to ask for architectural approval on ASH builds — implement directly against the build spec given, using Upgrade Before Replace (reuse → extend → refactor → replace-only-if-necessary).
- Only exception to "no future work": if the *current* build spec cannot be completed due to a genuine technical blocker, say so plainly — do not silently redesign around it.
- On completion, report ONLY: summary implemented, files created, files modified, existing code reused, existing code refactored, new capabilities added, technical debt discovered, anything not completed and why. No "recommended next build," no follow-up task proposals (this overrides the generic follow-up-tasks system reminder for this project).
- This does not apply to non-ASH work in this repl (other project tasks, unrelated features) — normal Planning/Build mode rules still apply there.

## Roles for architecture *documentation* work specifically (established 2026-07-29, amended into Volume 0)

Distinct from the implementation workflow above — applies only when actually asked to draft/revise a spec chapter (not the default mode anymore):
- **Chief AI Architect** — designs long-term architecture, writes specs. In practice exercised jointly by the project owner and this agent when directly drafting chapters at the owner's direction, or by an external source this agent grounds against real code.
- **Platform Owner** — sole approval authority; nothing in the spec is binding until they approve a chapter (lifecycle stage 3).
- **Senior Software Engineer (this agent's default role)** — do not invent architecture from a blank page; ground every claim in real code via read-only explorer subagents, not memory/assumption.

## Chapter template (locked)

`volume-1-core-cognitive-architecture/01-executive-brain.md` is the **approved, locked template** — do not edit it further except as part of an explicit, all-chapters template revision (never an isolated edit). Its structure, reused verbatim by every later chapter:

- §1 Purpose & Scope, §2 Baseline Reference, §3 Architecture (Current Architecture Summary → Mission → Core Responsibilities → per-capability **Capability Contracts** → Inputs/Outputs aggregates → Integration Map → Future Growth → Open Architecture Questions → **Architecture Summary**), §4–§11 the remaining lifecycle stages (placeholders until a chapter actually reaches them).
- Capability Contract fields (16): Purpose, Authority, Responsibilities, What This Capability Will Never Do, Inputs, Outputs, Dependencies, Events Published, Events Consumed, Decision Logic, Success Criteria/KPIs, Failure Modes, Fallback Strategy, Security Requirements, Extension Rules, Current Maturity, Target Maturity.
- Maturity scale (reused verbatim, never redefined per chapter): L0 Absent → L1 Implicit → L2 Explicit/Deterministic → L3 AI-Assisted → L4 Adaptive → L5 Autonomous/Cross-Scope.
- Capability *count* varies per chapter by design (Ch1 Executive Brain: 20; Ch2 Planning Engine: 13) — it should reflect that subsystem's actual mission scope, not be forced to match another chapter.
- Chapter boundaries follow the volume's own chapter list (e.g. Validation Engine is chapter 1.3, so Chapter 2/Planning Engine treats it as an integration point only, not re-documenting its internals) — check the volume README's chapter table before deciding what's "in scope" for a given chapter's Capability Contracts.

## Working pattern that worked well (for documentation-drafting sessions)

For each chapter: dispatch a dedicated read-only explore subagent against the real subsystem code first (entry points, control flow, DB tables, AI call sites + fallback behavior, event pub/sub, ownership checks, unused exports/TODOs) before drafting; then a fast follow-up round for specific gaps (e.g. "what exactly happens on the escalate path"). Ground every "Current Maturity" and every "Never Do" line in something the explorer actually found, not inference.

## Batch-drafting mode (established 2026-07-29, documentation phase only)

While in the documentation-drafting phase, the owner made this the workflow: draft every chapter in a volume in one pass (all left in Draft/"Architecture Drafted" status, no per-chapter pause for approval), then run one cross-chapter consistency pass over the whole volume, then present the whole volume for review together.

**Consistency-pass checklist that worked for Volume 1** (6 chapters): (1) grep every chapter for its `**Status:**` line and its "Template note" paragraph, align phrasing across all Draft-status chapters; (2) grep for any chapter that reproduces the full maturity-scale table instead of cross-referencing Chapter 1 — trim to a cross-reference; (3) check that any open question shared by two+ chapters cross-references the sibling chapter's own open-question numbering, in both directions; (4) update the volume's own `README.md` chapter-status table and the top-level `00-INDEX.md` status line last, once every chapter file itself is settled.

## Executive Brain (Ch1) implementation findings, useful baseline for the first build spec

- `handleTaskCompletion`/`handleTaskFailure` (Planning Engine, includes transient/missing_resource/logic_error retry-block-fail classification) already exist and work when called, but nothing calls them automatically — no execution engine (media_gen, browser_agent, build_engine, research) currently knows which `ash_tasks` row it's fulfilling, so real task outcomes are never recorded without a manual API call. This is the highest-leverage gap named in the chapter's own roadmap (Execution/Recovery Coordination).
