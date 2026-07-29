---
name: ASH Brain Master Architecture Specification — process and roles
description: How chapters in docs/superpowers/specs/ash-brain-master-architecture-specification/ get authored, reviewed, and approved, and what this agent's role is in that process. Read before touching any chapter file.
---

## Where this lives

- Master index: `docs/superpowers/specs/ash-brain-master-architecture-specification/00-INDEX.md` — Upgrade Before Replace law, nine-stage chapter lifecycle, volume/chapter table, and the "Chapter Template" pointer.
- Charter: `docs/superpowers/specs/ash-brain-master-architecture-specification/volume-0-governing-principles/README.md` — platform philosophy, long-term objective, roles, and the amendment log for the process itself.
- Baseline: `docs/superpowers/specs/2026-07-29-ash-brain-master-xray.md` — accepted as-built inventory; every chapter's §3.1 must ground itself in this plus fresh code reads, not assumption.

## Roles (established 2026-07-29, amended into Volume 0)

- **Chief AI Architect** — designs long-term architecture, writes specs, defines capabilities/subsystems. In practice in this workspace, exercised jointly by the project owner and this agent when directly drafting chapters at the owner's direction, or by an external source (e.g. a spec pasted in from elsewhere) that this agent then grounds against real code.
- **Platform Owner** — sole approval authority. Nothing in the spec is binding until they approve a chapter (lifecycle stage 3).
- **Senior Software Engineer (this agent's default role)** — do not invent architecture from a blank page. Review proposed architecture against the actual implementation, validate every capability is grounded in real code, flag engineering conflicts/reuse opportunities/risks, and recommend extension vs. refactor vs. (rarely) replacement. When a future capability can't reasonably evolve from current code, say plainly why and what's required — don't quietly default to a redesign.

**Why:** the project owner explicitly reframed prior sessions' "co-author architecture" pattern into this stricter separation, to keep architecture authorship/approval with themselves (or an external architect) and keep this agent's role centered on grounding, engineering judgment, and eventual implementation.

**How to apply:** every future chapter draft should still be written by this agent (per direct owner instruction, that hasn't changed in practice), but must be explicitly grounded via read-only explorer subagents against the real code (not written from memory/assumption), and any capability that can't evolve from existing architecture needs its "why / what prevents it / recommended approach (extend/refactor/replace)" stated inline — this is now a checked requirement, not just good practice.

## Chapter template (locked)

`volume-1-core-cognitive-architecture/01-executive-brain.md` is the **approved, locked template** — do not edit it further except as part of an explicit, all-chapters template revision (never an isolated edit). Its structure, reused verbatim by every later chapter:

- §1 Purpose & Scope, §2 Baseline Reference, §3 Architecture (Current Architecture Summary → Mission → Core Responsibilities → per-capability **Capability Contracts** → Inputs/Outputs aggregates → Integration Map → Future Growth → Open Architecture Questions → **Architecture Summary**), §4–§11 the remaining lifecycle stages (placeholders until a chapter actually reaches them).
- Capability Contract fields (16): Purpose, Authority, Responsibilities, What This Capability Will Never Do, Inputs, Outputs, Dependencies, Events Published, Events Consumed, Decision Logic, Success Criteria/KPIs, Failure Modes, Fallback Strategy, Security Requirements, Extension Rules, Current Maturity, Target Maturity.
- Maturity scale (reused verbatim, never redefined per chapter): L0 Absent → L1 Implicit → L2 Explicit/Deterministic → L3 AI-Assisted → L4 Adaptive → L5 Autonomous/Cross-Scope.
- Capability *count* varies per chapter by design (Ch1 Executive Brain: 20; Ch2 Planning Engine: 13) — it should reflect that subsystem's actual mission scope, not be forced to match another chapter.
- Chapter boundaries follow the volume's own chapter list (e.g. Validation Engine is chapter 1.3, so Chapter 2/Planning Engine treats it as an integration point only, not re-documenting its internals) — check the volume README's chapter table before deciding what's "in scope" for a given chapter's Capability Contracts.

## Working pattern that worked well

For each chapter: dispatch a dedicated read-only explore subagent against the real subsystem code first (entry points, control flow, DB tables, AI call sites + fallback behavior, event pub/sub, ownership checks, unused exports/TODOs) before drafting; then a fast follow-up round for specific gaps (e.g. "what exactly happens on the escalate path"). Ground every "Current Maturity" and every "Never Do" line in something the explorer actually found, not inference.
