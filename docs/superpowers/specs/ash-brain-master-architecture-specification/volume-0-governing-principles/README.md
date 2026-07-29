# Volume 0 — Governing Principles & Process

**Status:** Established 2026-07-29. Amended 2026-07-29 (Development Workflow & Roles).

This volume is the charter for the entire specification, not a subsystem volume — it has no numbered chapters of its own. Its content lives partly in [the master index](../00-INDEX.md) (the Upgrade Before Replace law, the nine-stage chapter lifecycle, the volume/chapter/section structure, and the locked chapter template) and partly here (the platform philosophy, the development workflow, roles, and the long-term objective).

This README exists so Volume 0 appears consistently alongside Volumes 1-8 in tooling and navigation, and as the place to record amendments to the governing process itself. Any such amendment is logged here with a date and rationale before the master index or this file is updated to match.

## Platform Philosophy

ASH is not being rebuilt — it is evolving. The current implementation (as inventoried in the Master X-RAY) is the permanent foundation of the platform, and remains the official baseline for every engineering decision made under this specification. Every enhancement follows the Upgrade Before Replace law defined in the master index: reuse, then extend, then refactor, and replace only when a documented justification shows the current architecture genuinely cannot support the requirement. No subsystem is ever rewritten simply because a different implementation exists or would be preferable in the abstract.

## Long-Term Objective

ASH is being built into an AI Business Operating System, not a chatbot — conversation is one interface into it, not the product itself. The objective is an AI executive capable of helping users build, launch, operate, automate, grow, scale, optimize, protect, and continuously improve online businesses, while keeping the business owner in control of decisions that matter to them. Every volume and chapter in this specification exists in service of that objective; a chapter's Mission section (§3.2 in the locked template) should always trace back to it.

## Development Workflow & Roles

Three roles govern how architecture moves from idea to running system under this specification:

- **Chief AI Architect** — designs the long-term architecture, writes architecture specifications, defines capabilities and subsystems, and defines how ASH evolves. In this workspace, this role is exercised jointly by the project owner and this agent when directly authoring chapter drafts at the project owner's direction; it may also be exercised by an external source (e.g. a specification pasted in from another system) that this agent then grounds and validates against the real codebase before it becomes part of this specification.
- **Platform Owner** — reviews and approves architecture before implementation. Approval authority for every chapter rests here; nothing in this specification is binding until the Platform Owner approves it (see the master index's chapter lifecycle, stage 3).
- **Senior Software Engineer** (this agent's default working role) — does not invent platform architecture from a blank page. Responsible for: reviewing architecture against the current implementation; validating that every proposed capability is grounded in real code, not assumption; identifying engineering conflicts, reuse opportunities, and technical risks; recommending whether a gap should be closed by extension, refactor, or (rarely, and only when justified) replacement; implementing approved specifications; performing compliance audits; and performing optimization once functional correctness is confirmed. When a chapter proposes a capability that cannot reasonably evolve from the current implementation, this agent states plainly why, what prevents it, and which of extension/refactor/replacement is the recommended path — rather than silently defaulting to a redesign.

**Architecture First.** Architecture originates from an approved build specification, not from implementation. Architecture is no longer generated as a side effect of writing code. Implementation follows architecture; engineering follows implementation; compliance follows engineering — in that order, per chapter, per the master index's lifecycle stages.

## Amendment Log

- **2026-07-29 — Development Workflow & Roles established.** Adopted the Chief AI Architect / Platform Owner / Senior Software Engineer role separation, the Architecture First ordering (architecture → implementation → engineering → compliance), and the platform's long-term objective statement, per the project owner's "ASH Brain Master Architecture — New Permanent Development Workflow" directive. This replaces any prior informal process and governs every chapter from Volume 1, Chapter 2 onward. Volume 1, Chapter 1 (Executive Brain) was authored and approved before this amendment and remains valid as the locked chapter template; it is not revisited to retrofit this amendment.
