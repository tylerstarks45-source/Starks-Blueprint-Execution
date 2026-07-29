# ASH Brain Master Architecture Specification

**Status:** In progress. Volume 1, Chapter 1 (Executive Brain) is Approved and locked as the chapter template. Volume 1, Chapters 2–6 (Planning Engine, Validation Engine, Memory Engine, Research & Knowledge Engine, ASH Self-Improving Brain) are drafted as a single batch (Architecture stage) and are pending a cross-chapter consistency pass before being presented together for architectural review.
**Established:** 2026-07-29
**Baseline:** [`docs/superpowers/specs/2026-07-29-ash-brain-master-xray.md`](../2026-07-29-ash-brain-master-xray.md)

---

## What this document is

This is the permanent blueprint for the ASH platform. Every future implementation originates here. It is not written in one pass — it is developed volume by volume, chapter by chapter, each one carried through a fixed review-and-approval lifecycle before it is considered trustworthy enough to build against.

This is **not** a rebuild and **not** a redesign of ASH. The system documented in the Master X-RAY (linked above) is the accepted foundation. This specification exists to formalize, extend, and govern that foundation going forward — not to replace it.

## Primary Architectural Law: Upgrade Before Replace

Every piece of architecture work under this specification — every chapter, every proposal — must follow this order:

1. **Reuse** existing architecture.
2. **Extend** existing architecture.
3. **Refactor** existing architecture.
4. **Replace** only if absolutely necessary.

Replacement is the last resort. Any proposal to replace an existing subsystem must justify itself with all five of the following, in the chapter's Architecture section:

- Why the current architecture cannot support the requirement.
- Benefits of replacement.
- Migration strategy.
- Rollback strategy.
- Compatibility impact.

Absent that justification, the subsystem is extended, not replaced.

## The Chapter Lifecycle

Every chapter in every volume moves through the same nine stages, in order. A chapter is not "done" until it reaches **Locked** — partially completed chapters are not left behind in favor of starting new ones.

| Stage | Meaning |
|---|---|
| **1. Architecture** | The chapter's design is drafted, reusing/extending existing systems per the law above. |
| **2. Architecture Review** | The draft is reviewed for soundness, edge cases, security, and performance. |
| **3. Approval** | The reviewed architecture is formally approved to proceed. |
| **4. Implementation** | The approved architecture is built. |
| **5. Compliance Audit** | The implementation is checked against the approved architecture. |
| **6. Gap Remediation** | Any gaps found in the audit are closed. |
| **7. Final Audit** | Confirms all gaps are remediated and the implementation matches the approved design. |
| **8. Optimization** | Performance, security, and UX refinements after functional correctness is confirmed. |
| **9. Locked** | The chapter is complete and stable. Further changes require a new revision cycle, not an in-place edit. |

Each chapter file's section numbers 3–11 mirror these stages exactly, so a chapter's status is always visible from its own structure, not just a label.

## Roles in this process

- **Architecture authorship and approval** belong to the project owner (the human directing this specification).
- **This agent's role** is architecture review, engineering validation, edge-case identification, implementation, compliance auditing, gap analysis, performance review, security review, and refactoring recommendations — challenging implementation details where warranted, while preserving approved architecture unless a genuine engineering issue requires reopening it.

## Chapter Template

[Volume 1, Chapter 1 — Executive Brain](./volume-1-core-cognitive-architecture/01-executive-brain.md) is the **approved, locked template** for every chapter in this specification. It fixes:

- The section skeleton (§1 Purpose & Scope, §2 Baseline Reference, §3 Architecture, §4–§11 the remaining lifecycle stages).
- Within §3: a "Current Architecture Summary" grounded in the real codebase, a Mission statement, Core Responsibilities, per-capability **Capability Contracts** (Purpose, Authority, Responsibilities, What This Capability Will Never Do, Inputs, Outputs, Dependencies, Events Published, Events Consumed, Decision Logic, Success Criteria/KPIs, Failure Modes, Fallback Strategy, Security Requirements, Extension Rules, Current Maturity, Target Maturity), an Inputs/Outputs aggregate, an Integration Map, Future Growth, Open Architecture Questions, and a closing **Architecture Summary** (maturity assessment, technical debt, deferred decisions, risks, roadmap, chapter approval checklist).
- The six-level maturity scale (L0 Absent → L5 Autonomous/Cross-Scope), reused verbatim by every chapter rather than redefined per chapter.

Do not revisit Chapter 1 to refine it further. If a genuine improvement to the template is discovered while writing a later chapter, propose it as an explicit, standalone template revision applied consistently across **all** chapters (including Chapter 1) — never as an isolated edit to whichever chapter happened to surface it. Forward progress on new chapters takes priority over template polish.

## Structure: Volumes, Chapters, Sections

The specification is organized into **volumes** (major architectural domains), each containing **chapters** (one per subsystem or cohesive capability), each with the fixed **section** skeleton described above. This mirrors the domain boundaries already surfaced in the Master X-RAY, so every existing subsystem has an obvious home, and every volume has room to grow new chapters as ASH grows new capabilities.

| Volume | Title | Chapters |
|---|---|---|
| [0](./volume-0-governing-principles/README.md) | Governing Principles & Process | (charter volume — no subsystem chapters) |
| [1](./volume-1-core-cognitive-architecture/README.md) | Core Cognitive Architecture | 6 |
| [2](./volume-2-business-intelligence-domain-data/README.md) | Business Intelligence & Domain Data | 6 |
| [3](./volume-3-runtime-execution/README.md) | Runtime & Execution | 6 |
| [4](./volume-4-platform-services-integrations/README.md) | Platform Services & Integrations | 6 |
| [5](./volume-5-api-data-platform/README.md) | API & Data Platform | 4 |
| [6](./volume-6-security-governance-compliance/README.md) | Security, Governance & Compliance | 5 |
| [7](./volume-7-performance-scalability-reliability/README.md) | Performance, Scalability & Reliability | 3 |
| [8](./volume-8-extensibility-roadmap/README.md) | Extensibility & Roadmap | 4 |

Every chapter file currently exists as an empty skeleton at **Status: Not Started**. No architecture content has been authored yet — this task was the framework only.

## Extending the framework

New capabilities get a new chapter inside the most relevant existing volume. A genuinely new architectural domain — one that doesn't fit any volume above — gets a new volume, numbered sequentially, added to the table above and given its own `README.md` following the same pattern. Volumes and chapters are never renumbered once a chapter has left "Not Started," to keep references stable.
