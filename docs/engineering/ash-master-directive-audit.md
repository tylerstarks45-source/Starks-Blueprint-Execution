# ASH Master Directive — Platform Audit

Audit of the "ASH Autonomous Executive Intelligence Master Platform" directive against the code in this repository. Every status is evidence-based:

| Status | Meaning |
|---|---|
| **Verified** | Implemented and covered by automated tests that run in CI |
| **Implemented, unverified** | Code, tables and routes exist; no automated test proves behaviour |
| **Partial** | Some of the capability exists; named gaps remain |
| **In open PR** | Implemented and tested on an open PR (not yet on `main`) |
| **Not present** | No code found |
| **Blocked** | Needs an owner decision, credential, or external system |

"Open PR" references are to PRs #1–#21 in this repository. Nothing here is a claim about the live Replit deployment, which this audit could not inspect directly.

## 1. Current platform architecture

pnpm monorepo: `artifacts/api-server` (Express 5, TypeScript), `artifacts/web` (React + Vite 7 + Tailwind 3), `artifacts/desktop` (Tauri v2 shell), `artifacts/mockup-sandbox`, `lib/db` (Drizzle ORM, PostgreSQL 16), `lib/api-spec` + generated Orval clients. Auth is JWT (`bcryptjs`, `jsonwebtoken`) with API keys for machine callers. Background work runs in the in-process scheduler/worker (`lib/runtime/`). See `docs/engineering/architecture-map.md` (PR #4) for the full map.

## 2. Brain inventory

The Cognitive Foundation (`lib/cognitive-foundation/`) holds an in-process **Brain Registry**, **Capability Registry** and **Extension Point** registry. Core brains are registered at boot by `register-core-brains.ts` with health probes; health is cached (30 s) and served at `GET /api/executive-brain/brains` and `/health-report`. The Executive Brain is the coordinating pre-pass (`routes/executive-brain.ts`). Status: **Implemented, unverified** (no registry test on `main`); now surfaced to users on the ASH Brain page (PR #21).

## 3. Engine inventory and recovered 001–055 roadmap (items 3 and 13)

Recovered from `.agents/memory/MEMORY.md`, `docs/superpowers/reports/` and code comments. Each build has a schema file in `lib/db/src/schema/` and a route file in `artifacts/api-server/src/routes/` unless noted. Only the ASH pipeline, platform tools, business intelligence, memory isolation, research reuse and health-monitor paths have tests on `main`, so most builds are **Implemented, unverified**.

| Build | Name | Evidence | Status |
|---|---|---|---|
| 001 | Cognitive Foundation & Executive Brain Evolution | `cognitive-foundation/`, `executive-brain.ts` | Implemented, unverified |
| 002 | Cognitive Orchestration Engine | `cognitive-foundation/orchestration.ts` | Implemented, unverified |
| 003 | Executive Reasoning Pipeline | `cognitive-foundation/reasoning*` | Implemented, unverified |
| 004 | Cognitive Memory Architecture | `cognitive_artifacts` table | Implemented, unverified |
| 005 | Cognitive Knowledge Graph | `cognitive_graph.ts`, `knowledge-graph.ts` | Implemented, unverified |
| 006 | Executive Context Engine | `executive_context.ts` | Implemented, unverified |
| 007 | Executive Judgment Engine | `executive_judgment.ts` | Implemented, unverified |
| 008 | Executive Goal Engine | `executive_goal.ts` | Implemented, unverified |
| 009 | Executive Planning Engine | `executive_plan.ts` | Implemented, unverified |
| 010 | Executive Execution Engine | `executive_execution.ts` (adapters are interfaces only) | Partial |
| 011 | Executive Observation Engine | `executive_observation.ts` | Implemented, unverified |
| 012 | Executive Reflection Engine | `executive_reflection.ts` | Implemented, unverified |
| 013 | Executive Principle Learning Engine | `executive_learning.ts` | Implemented, unverified |
| 014 | Executive Governance & Adaptation Engine | `executive_governance.ts` | Implemented, unverified |
| 015 | Business Graph & Health Engine | `business_graph.ts`, `business_health*.ts` | Verified (`health-monitor-unmeasured.test.ts`, `business-intelligence.test.ts`) |
| 016 | Business Analysis Engine | `business_analysis.ts`; tenant isolation PR #8 | In open PR (isolation tests) |
| 017 | Opportunity Discovery Engine | `opportunity_discovery.ts`; PR #8 | In open PR (isolation tests) |
| 018 | Future State Simulation Engine | `future_simulation.ts`; PR #8 | In open PR (isolation tests) |
| 019 | Decision Intelligence Engine | `decision_intelligence.ts`; PR #8 | In open PR (isolation tests) |
| 020 | Executive Strategy Engine | `executive_strategy.ts`; PR #8 | In open PR (isolation tests) |
| 021 | Strategic Planning Engine | `strategic_planning.ts`; PR #8 | In open PR (isolation tests) |
| 022 | Capability Planning Engine | `capability_planning.ts`; PR #8 | In open PR (isolation tests) |
| 023 | Operational Planning Engine | `operational_planning.ts`; PR #8 | In open PR (isolation tests) |
| 024 | Execution Orchestration Engine | `execution_orchestration.ts`; PR #8 | In open PR (isolation tests) |
| 025 | Authority Resolution Engine | `authority_resolution.ts` | Implemented, unverified |
| 026 | Execution Risk Assessment Engine | `execution_risk.ts` | Implemented, unverified |
| 027 | Execution Simulation Engine | `execution_simulation.ts` | Implemented, unverified |
| 028 | Intelligent Workflow Execution Engine | `workflow-execution.ts` | Implemented, unverified |
| 029 | Universal Execution Engine | `universal-execution.ts` | Implemented, unverified |
| 030 | Universal Execution Adapter Framework | `adapter_framework.ts` (5 seeded built-ins) | Partial |
| 031 | Adaptive Capability Intelligence Engine | `capability_intelligence.ts` | Implemented, unverified |
| 032 | Platform Infrastructure Intelligence Engine | `platform_infrastructure.ts` (admin-only, heuristic) | Implemented, unverified |
| 033 | Global Technology Intelligence Engine | `global_technology.ts` | Implemented, unverified |
| 034 | Technology Relationship Intelligence Engine | `technology-relationships.ts` | Implemented, unverified |
| 035 | Technology Evolution Intelligence Engine | `technology-evolution.ts` | Implemented, unverified |
| 036 | Systems Dynamics Intelligence Engine | `systems-dynamics.ts` | Implemented, unverified |
| 037 | Executive Trade-off Intelligence Engine | `tradeoff-intelligence.ts` | Implemented, unverified |
| 038 | Executive Portfolio Intelligence Engine | `portfolio_intelligence.ts` | Implemented, unverified |
| 039 | Executive Priority Intelligence Engine | `priority_intelligence.ts` | Implemented, unverified |
| 040 | Unified Cognitive Orchestration Engine | `unified-orchestration.ts` | Implemented, unverified |
| 041 | Unified Cognitive Knowledge Graph Engine | `knowledge_graph.ts` | Implemented, unverified |
| 042 | *Unresolved* — the only reference is "Wait for Build 042"; no spec, schema or route found | — | **Unresolved historical item** |
| 043 | Unified Digital Operating Layer | `digital_operating.ts` | Implemented, unverified |
| 044 | Unified Connections & Integration Hub | `connections_hub.ts` (credentials stored as references) | Implemented, unverified |
| 045 / 045A / 045C | Certification & Launch Readiness; Launch Hardening | `certification.ts`, `launch_hardening.ts`; admin-check bug fixed in PR #10 | In open PR (admin tests) |
| 046 | Unified Platform Operating System | `unified-platform.ts` | Implemented, unverified |
| 047 | Unified Workspace & Project System | `unified-workspace.ts` | Implemented, unverified |
| 048 | Unified Business Asset Framework | `unified-asset.ts` | Implemented, unverified |
| 049 | Unified Builder Runtime Engine | `unified-builder-runtime.ts` | Implemented, unverified |
| 050 | Unified Application Framework | `unified-application-framework.ts` | Implemented, unverified |
| 051 | Unified Visual Component Framework | `unified-visual-component-framework.ts` | Implemented, unverified |
| 052 | Universal Canvas Engine | `universal-canvas-engine.ts` | Implemented, unverified |
| 053 | Business Experience Builder | `business-experience-builder.ts` | Implemented, unverified |
| 054 | Unified Customer Intelligence Engine | `unified-customer-intelligence.ts` | Implemented, unverified |
| 055 | Unified Business Process Engine | `unified-business-process.ts` | Implemented, unverified |

Builds 056 (Unified Revenue, Commerce & Monetization — no payment execution) and 057 (Unified External Capability & Integration OS) also exist beyond the original roadmap.

Most engines 016–057 are **deterministic metadata/registry layers** (registries, scores, plans) feeding the Executive Brain on throttled cycles. They describe and plan; few of them act on the outside world. That distinction matters for every "autonomous" claim below.

## 4. Memory and knowledge

| Capability | Evidence | Status |
|---|---|---|
| Per-user long-term memory (scoped global/business) | `user_memory`, `memory-engine/long-term-memory.ts` | Verified (`memory-engine-business-isolation.test.ts`) |
| Knowledge memory (research findings) | `ash_knowledge_entries`, `memory-engine/knowledge-memory.ts` | Verified (`research-knowledge-reuse.test.ts`) |
| Cross-user learned lessons (privacy-safe) | `ash_lessons`, `ash-brain.ts` distillation | In open PR (#17, #19 tests) |
| Project / goal / task memory | `ash_projects`, `ash_goals`, `ash_tasks` | Implemented, unverified |
| User style profile (personality adaptation) | `user_memory` key `ash_style_profile` | In open PR (#21 tests) |

## 5. Database

PostgreSQL 16 via Drizzle; ~110 schema files. Versioned migrations + baseline + CI Postgres were merged in PR #3. Backup/restore drill: PR #7. Production still uses `drizzle push` in `scripts/post-merge.sh` — **Blocked** on the owner running `db:baseline` on Replit.

## 6. AI provider and gateway

All chat, tool-calling, research, speech-to-text, TTS and image calls go through OpenRouter with credit billing and usage logging (`lib/openrouter.ts`, `lib/openrouter-media.ts`, `lib/models.ts`; PRs #11, #16). ElevenLabs remains an optional user-supplied TTS key. Status: **In open PR** (live calls validated once with the owner's key; tests use mocked responses).

## 7. Business operating systems

Business portfolio, health scoring, recommendations, Operations Mode, landing pages, email marketing, social scheduling, affiliate links, domains, white-label and client workspaces all have routes + UI. Recommendation outcome measurement and confidence calibration: PRs #17, #19. Weekly per-business research: PR #15. Daily online-income research: PR #18.

## 8. Financial and payment integrations

Stripe subscriptions + credit purchases with idempotent webhooks (`processed_stripe_events`), credit ledger (`credit_transactions`), revenue-provider sync (`revenue-providers.ts`). Status: **Implemented, unverified** (no payment tests).

## 9. Wallet / cryptocurrency

**Not present.** "Wallet" references are the user credit balance only. No custody, treasury, on-chain or payment-execution code exists. Build 056 explicitly performs no payment execution.

## 10. Automation

Scheduler + worker with advisory-lock single-runner (PR #5), scheduled tasks, scheduled posts, approvals queue (`pending_approvals`, `approval-executor.ts`), connectors registry. Browser agent route exists (`browser-agent.ts`). Desktop computer-control: Tauri shell exists; **no OS-level control** found.

## 11. Development and deployment

GitHub Actions CI (typecheck, tests with Postgres, Orval drift check — PR #9), Replit hosting. No staging environment, no automated deploy pipeline, no rollback tooling beyond Replit history.

## 12. Security and permissions

JWT + API keys, `requireAuthActive`, async `requireAdmin`, helmet + AI rate limits + error redaction (PR #1), authorization sweep over every mutating route (PR #6), tenant isolation for engines 016–024 (PR #8), launch-hardening admin fix (PR #10). Owner actions outstanding: rotate bootstrap token/admin passwords/OpenRouter key, make repos private.

## 14. Feature-by-feature comparison with the directive

| # | Directive area | Status | Evidence / gap |
|---|---|---|---|
| 1 | Chief Executive Brain | Partial | Executive Brain pre-pass + registry exist; the user-facing ASH agent (`runAshAgent`, PR #12) is the actual decision loop. They are not yet unified into one loop. |
| 2 | Specialist Brain Network | In open PR | `consult_specialist` with finance, marketing, operations, research, strategy (PR #20). Specialists are read-only. |
| 3 | Cognitive Memory & Knowledge | Verified / In open PR | §4 |
| 4 | Executive Planning & Execution | Partial | Planning engines generate plans; execution adapters (Build 010/030) are mostly interfaces. ASH executes via native tools and client workspace actions. |
| 5 | Business Brain | Implemented, unverified | Business intelligence pipeline, health scores, recommendations. |
| 6 | Autonomous Economic Intelligence | Partial | Research (weekly, daily), measured outcomes, calibrated confidence. No capital-allocation model. |
| 7 | ASH Wallet & Treasury | Not present / Blocked | Requires owner decisions: custody provider, legal/regulatory review, spending limits, approval tiers. Must not be built speculatively. |
| 8 | Venture Factory (17-step pipeline) | Partial | Steps 1–8 exist across opportunity discovery, research, blueprints and builder; steps 13 (payments), 14 (launch to channels), 17 (profitability reporting per venture) are not automated. |
| 9 | AI Employee System | Partial | Specialists (PR #20) are the nearest equivalent; no persistent, scheduled "employee" with its own queue. |
| 10 | Software Engineering System / controlled self-improvement (12 steps) | Partial | Steps 1–4 (lesson distillation, outcome measurement, calibration) exist. Steps 6–12 (isolated changes, tests, approval, promotion, rollback of *code*) are not present and should not run unattended in production. |
| 11 | Integration & Automation | Implemented, unverified | §10 |
| 12 | Security & Governance | In open PR | §12; Governance engine (Build 014) is descriptive. |
| 13 | Monitoring & Observability | Partial | Health report, monitoring logs, usage logs; ASH Brain + Stats pages (PR #21). No external alerting/metrics backend. |
| — | Global ASH interface (every page, text + voice) | In open PR | PR #21 |
| — | Personality that adapts to the user | In open PR | PR #21 |
| — | Stats page / ASH Brain page with gauges | In open PR | PR #21 |
| — | Unreal command center + digital human | In open PR | PR #13 (`/api/command-center/*`, Aura-2 MP3 for audio-to-face) |
| — | Operate an authorized desktop computer | Not present | Tauri shell only; needs a design for a sandboxed, permissioned local agent. |

## 15. Duplicate, incomplete, disconnected, missing

- **Duplicate:** two chat paths — the streaming `/ai-orchestrator/chat` (~1,100 lines, used by Builder) and the tool-calling `/ash/agent` (used by the dock, Unreal). Converge by migrating Builder chat to `/ash/agent` with streaming.
- **Duplicate naming:** several engines needed renamed tables to avoid collisions (`ue_execution_reports`, `ubre_diagnostics`, `dol_execution_sessions`, capability registries in two builds).
- **Incomplete:** execution adapters (010/030), venture launch/payment steps, AI employees.
- **Disconnected:** most 016–057 engines have APIs but no UI and are not consulted by `runAshAgent`. Their outputs reach users only through the Executive Brain context note.
- **Previously fake UI, now fixed (PR #21):** dashboard "AI Active 100%" tile and "128 Countries Active" panel.
- **Missing:** wallet/treasury, desktop control, code self-improvement pipeline, external alerting.

## 16. Dependency map (simplified)

```
OpenRouter gateway ─► runAshAgent ─► server tools (businesses, research, lessons)
                          │          └► consult_specialist ─► runAshAgent (read-only)
                          └► client tools ─► web dock / Builder / Unreal
Scheduler/worker ─► research (weekly, daily) ─► Knowledge Memory ─► prompts
                └► outcome measurement ─► ash_lessons ─► calibration ─► recommendations
Executive Brain ─► Brain Registry ─► engines 001–057 (throttled cycles) ─► context note
Postgres ◄─ everything; backups (PR #7); migrations (PR #3)
```

## 17. Prioritized implementation plan

1. **Merge the open chain** (#1, #5–#21) after owner review — most "In open PR" items become Verified on `main`.
2. **Owner security actions** (rotate secrets, private repos, `APP_URL`, DB baseline).
3. **Unify chat**: Builder uses `/ash/agent` with streaming; retire duplicate prompt logic.
4. **Expose engine outputs as ASH tools** (read-only): portfolio, priority, opportunity, strategy summaries, so the Chief Executive loop actually uses Builds 016–039.
5. **AI employees**: scheduled specialists with their own task queue and approval gates (reuse scheduler + `pending_approvals`).
6. **Venture pipeline automation** for steps 9–17, behind approvals.
7. **Wallet/treasury** — only after owner decisions (§14 row 7).
8. **Controlled code self-improvement** — proposals as PRs only (never self-deploy), gated by CI and owner merge.
9. **Desktop agent** — separate design with explicit permissions.

## 18. Complexity and risks

- Highest risk: any feature that moves money or changes code autonomously. Both must stay approval-gated.
- Medium: chat unification (large, user-facing; needs browser testing).
- Production DB still on `push`; schema drift risk until baseline.
- Secrets exposed in repo history until owner rotation.

## 19. Test and verification strategy

- Backend: vitest + real Postgres in CI for every material change; authorization sweep (PR #6) guards new mutating routes; tenant-isolation tests per engine.
- AI: mocked OpenRouter responses in CI; periodic live smoke test with an owner-provided key.
- UI: build + typecheck in CI; recorded browser tests for user-facing flows (dock, brain page, stats) when approved.
- Data: backup/restore drill in CI (PR #7).
