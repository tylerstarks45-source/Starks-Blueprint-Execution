# ASH development roadmap

The November 26 master directive governs the remaining work. Continue from the existing candidate and reuse the current brains, tools, schemas and clients. Historical builds keep their original IDs in the [001–057 register](ash-master-directive-audit.md#3-historical-build-register-001057). The seven phases below are delivery phases.

**Public launch readiness** means one verified release of the paid platform with signup and billing opening together. Private staging, provider test accounts and recovery drills precede that release. **Full ASH vision completion** tracks the entire roadmap, including the independent economy, cross-device and Unreal work. Record the status and evidence per capability. Passing release acceptance does not establish a percentage for the full vision.

## Current capability coverage

Status vocabulary includes **Implemented and verified** (state the environment and scope), **Implemented but unverified**, **Partially implemented**, **Planning only**, **Not implemented**, **Blocked by dependency**, and **Requires owner authorization**. These are candidate-level findings at [2e54520](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/commit/2e54520a7baf0fb1c340710d4ac1e3f324ba27c5), except where noted. Local CI, sandbox browser checks, provider sandbox checks and production checks are distinct evidence.

| Subsystem | Status and current evidence | Work remaining |
|---|---|---|
| Accounts, auth, signup, verification, marketplace, subscriptions and credits | Partially implemented for launch. Core routes and authorization tests exist. | Verify tenant boundaries, real email delivery, account lifecycle, billing and support on staging. |
| Executive Brain, Brain Registry and historical reasoning, context, knowledge, planning, observation and reflection engines | Partially implemented. Registry and pipelines exist. Some normal entry points use other orchestration paths. See the historical register. | Reuse one ASH entry path and verify each registered engine in real workflows. |
| Specialist Brain Network and AI Workforce | Partially implemented. Five tool-using specialists and per-business staff in the candidate. | Durable delegation, permissions, assigned queues, performance and recovery evidence. |
| Persistent Memory and Knowledge | Partially implemented. User and business memory, research records, redaction and isolation tests. | Evidence retrieval on each surface, data lifecycle and cross-device continuity. |
| Research Lab, Opportunity Scanner and scheduled research | Partially implemented. Three optional or fallback retrieval integrations, seven-topic cadence, separate chat and income-plan research. | One shared evidence service, live provider proof and open-ended opportunity discovery. |
| Universal Goal Engine and Income Missions | Partially implemented. Candidate parses goals, compares opportunities including new types, and creates approved missions. Earlier private browser test used live AI research and a local database. | Typed milestones, verification criteria, cost, resources and dependencies from plan through scale. |
| ASH Control, Approvals and durable execution | Partially implemented. Main tool path and missions enforce owner rules and persist in Postgres. | Same checks on Builder, connector, custom API, scheduler and device paths. Prove stop, pause, revoke and duplicate prevention after restart. |
| Venture Factory, Empire, Business Type Registry, Income Streams and Asset Vault | Partially implemented. Candidates create workspaces, staff, memory and ledger. Empire records businesses, income streams and assets. | Execute complete venture workflows and store one authoritative record per asset with links from each relevant view. |
| Builder, websites, applications, commerce, CRM, customer support and automation | Partially implemented. Builder, connector and launch modules cover selected actions. | Evidence-backed build, test and launch, followed by recurring delivery and operations for each advertised business model. |
| Capability Registry, Connections Hub and integration synchronization | Partially implemented. Action lists, connection readiness and declarative custom APIs exist. | Authoritative action contracts, provider authorization, verified account readiness, revocation, and owner-tested registration. |
| Revenue, expenses, subscriptions, creator payouts and ledgers | Partially implemented. Provider ingestion, Stripe handling and Venture ledger exist. | Payment-specific entitlement reconciliation, consistent currency and gross/net reporting, fees, reversals, duplicate expense prevention and live test-mode acceptance. |
| Continuous Learning, Economic Memory for user businesses and Growth | Partially implemented. Daily outcome jobs and candidate weekly strategy reviews exist. | Evidence-based experiments, next-decision replay, safe scaling limits and versioned rollback. |
| ASH's independent ventures, Revenue Engine and accounting | Planning only as a distinct economy. User finance and Venture modules provide reusable components. | Isolated ownership model, books, sandbox provider adapters and separate economic memory. |
| ASH wallet, treasury, capital allocation, reinvestment, self-sustainability and Capital Deployment Bridge | Requires owner authorization for live custody and transfers. Provider-independent design remains in scope. | Simulated double-entry ledger, budget/risk controls and approval/audit records. Owner decides ownership, custody and compliance before live activation. |
| Shared ASH chat and ASH Live | Partially implemented. Candidate text, voice and page continuity passed Chromium sandbox suites. | Production WSS and real voice/provider proof, streaming speech and durable cross-device history. |
| Mobile, browser install and Windows companion | Partially implemented. Expo client, PWA install surface and remote Tauri shell exist. Supported native local operations are not implemented. | Device builds, signed installer, approved actions on scoped apps or files, visible logs and immediate revocation. |
| Unreal digital human | Blocked by dependency for actual character verification. Owner confirms the Unreal project exists separately. Web placeholder, command-center endpoints and ASH Live contract are present. | Use the existing project for adapter, session, transcript, lip sync, animation and mission-event tests. |
| Replit, backup, recovery and monitoring | Partially implemented. Local migrations, readiness, restore, workers and alerts passed prior checks. | Read actual deployed SHA and config, verify hostname and ingress, exercise migration, recovery and load on a protected copy. |

## Phase 1 — Integrate and stabilize

### Nine-PR sequence

The branches already form a local candidate above the last confirmed GitHub main, [9ac901b](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/commit/9ac901be8104163e56d4b271fdb2d80151fb6c23). The exact dependency order is [#33](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/33) safety and payment → [#34](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/34) income missions → [#35](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/35) capabilities → [#36](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/36) custom APIs → [#37](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/37) Venture Factory → [#38](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/38) launch adapters → [#39](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/39) strategy reviews → [#40](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/40) ASH Live → [#41](https://github.com/tylerstarks45-source/Starks-Blueprint-Execution/pull/41) shared ASH conversation.

1. Confirm all nine heads and their ancestry at the release freeze. Record the private Replit deployed SHA, branch, runtime, migration ledger, ingress and workers. Preserve any unpushed Replit work on its own branch.
2. Compare that branch with the candidate in an integration branch. Resolve differences without discarding features, then run CI and protected staging with the combined revision. Verify HTTP, WSS, scheduler/worker behavior, credit accounting and provider health.
3. Rehearse backup, restore, baseline and additive migrations against the protected copy. Replace production schema push with versioned migrations after confirming the baseline. Record the rollback revision, compatible database state and recovery timing. See the [Replit handoff](REPLIT-HANDOFF.md).
4. Land the stack in dependency order when its backend gates pass. Verify each next PR targets the already integrated base and preserves its changes. Record and test the final release SHA if the merge process changes it. Keep public signup and billing closed through Phase 7.

### Critical launch blockers

| Blocker | Closure evidence |
|---|---|
| Apex HTTPS, www routing, deployed SHA and runtime | Canonical HTTPS and redirect, deep links, WSS and readiness from external networks on the known candidate. Verify runtime parity with CI. |
| Generated previews, sites and applications share too much trust | Opaque or isolated origin for generated content, restricted trusted analytics/form handling, and tests proving no access to authenticated app state or other businesses. |
| Inconsistent authorization and legacy browser credential flow | A server policy check at each action entry point and again at dispatch, tenant and target scoping, approval and stop coverage. Use provider-supported authorization and remove the legacy credential-retrieval flow. |
| Credential exposure, repository visibility, dependencies and webhook sizes | Owner confirms rotation and repository visibility review. Patch production dependencies and verify bounded webhook parsing and signed provider traffic on staging ingress. |
| Paid entitlements and payroll/payouts | Link entitlement to settled payment, reconcile duplicate and out-of-order events, verify refund, dispute, cancellation, renewal and creator payouts against Stripe. |
| Revenue integrity | Keep currencies distinct, reconcile provider fees and reversals, reconcile expenses once, and prove deduplicated ingestion never skips a failed record. Label data freshness and distinguish actual, estimate and sandbox. |
| Provider action retries and completion claims | Durable execution record, provider verification and reconciliation on timeout or restart. Do not mark a step complete on an AI message alone. |
| Public claims and customer acceptance | Omit unsupported earnings and counts from public pages. Prove the Leaderboard and Success Wall use only verified production records before promoting them as evidence. Verify account flows, alerts, accessibility, capacity and recovery on the candidate. |
| Signup and billing activation | Verify server-side controls for public registration and new checkout before staging. Confirm restricted access before release and open public signup and billing together only after exact-candidate acceptance. |

## Phase 2 — Unify research, goals and execution

- **Research.** Route Chat, Builder, Research Lab, specialists, Venture Factory, missions, scheduled research and both opportunity lanes through the existing Research Engine and provider abstraction. Keep OpenRouter for models. Use official retrieval APIs with quota, budget and failover controls. Persist provider, timestamp, citation URL, finding and confidence in existing research records. Cross-check important claims, merge duplicate sources, distinguish contradictory evidence and surface freshness. Keep the seven-topic scan as a baseline and use fresh demand and market signals to discover unfamiliar models.
- **Goal and persistent mission.** Use the existing Executive Brain, income plans and mission runner. One lifecycle runs from goal through research, opportunity comparison, plan, authorization, build, test, launch, operate, measure, learn, improve and scale. Store business, target, budget, resources, limits, team, dependencies, typed action, completion criteria, receipts, financial measures, learning and next scheduled action. Atomic claims and leases protect multi-worker execution. Recover after logout and restart, and record blocked owner steps.
- **Action verification.** Issue a durable operation ID before an external call. Record actor, account, business, budget and exact approved action. Check permissions and connection at dispatch. Use provider idempotency keys or reconciliation before retry, with explicit uncertain, confirmed and cancelled states. A stop prevents new dispatches. Work already accepted by a provider is reconciled and reported. Link the verified receipt to the mission and authoritative asset.

## Phase 3 — Complete real business creation and operations

- **Reusable actions.** Bind create offer, build asset, price, take payment, acquire customers, deliver, support, measure and improve to typed provider-backed actions in the same registry. Separate account readiness from verification evidence for the exact action and execution surface.
- **Capability expansion.** Search the registry and official provider API docs first. Draft declarative integrations, test with scoped sandbox accounts and get owner approval before registering a version. Any new code is reviewed and tested in isolation before release. Browser support uses explicit, bounded actions on authorized first-party or test surfaces. Secrets and production activation stay in approved provider flows.
- **Venture Factory.** Extend existing workspace bootstrapping through demand validation, product development, branding, checkout, publishing, support and growth. Allocate specialist work and attach receipts to existing asset records. Use the registry to flag missing capabilities and resume eligible work after resolution.
- **Recurring operations.** SaaS runs health, subscriber and support queues. Commerce runs catalog, order, inventory and fulfillment queues. Newsletter and membership run content, subscriber and renewal queues. Digital products run delivery and updates. Services run lead, project and quality queues. Affiliate workflows track content and verified commissions. Store owner limits, intervals, alert conditions, retries and next run.

## Phase 4 — Expand learning and scaling

Run daily outcome jobs over recorded hypotheses, baselines, periods, costs, actions, results, sample sizes and confidence. Reuse private lessons only within the permitted owner scope. Publish vetted aggregate patterns only when the data can be safely shared. Compare each subsequent decision against the baseline and prior strategy. Retain, revise or retire lessons based on repeatable evidence. Version prompts, tools, workflow definitions and decision policies and test rollback. Use measured net margin, conversion, retention, acquisition cost, demand, capacity and available budget to decide growth. Keep spending changes within authorized caps.

## Phase 5 — Complete independent economic intelligence

Develop a sandbox-first economy with separate venture ownership, opportunity queues, accounting, economic memory and risk controls. Reuse Venture and finance components through scoped interfaces. Use a provider-independent double-entry ledger and simulated wallet. Record allowed capitalization sources, obligations, cash-flow forecasts, eligible expenses and reinvestment proposals. Add an approval and reconciliation boundary for the Capital Deployment Bridge. Keep customer assets separate. Owner decisions on entity, custody, geography, risk, legal and transaction controls are required for live operations.

## Phase 6 — Complete shared interfaces

Keep one authenticated ASH session and mission source across web chat, voice, mobile, desktop and Unreal. Verify session isolation, retention, reconnect and sign-out behavior. Use the existing ASH Live event contract for text, audio, expression and mission status. Register Windows devices with revocable, scope-limited access, visible logs and Stop. Use approved device operations for files and apps. Validate the real character in the separate Unreal project with shared text and voice, authentication, events, lip sync, movement and mission views. Record the adapter commit, compatible project version, character asset and animation interfaces needed for acceptance.

## Phase 7 — Exact-candidate acceptance and one public release

Use actual test providers where applicable. Record release SHA, test environment, account, authorization, action IDs, provider receipts, measured outcomes and failure/recovery evidence with secrets redacted. Mocks support regression testing. Provider acceptance requires provider evidence. Every end-to-end business case verifies a continuing operation after logout and worker restart.

| Scenario | Evidence required |
|---|---|
| A. Digital products | Approved offer, published product, paid test checkout, digital delivery, refunds and reconciled ledger. |
| B. Physical commerce | Product and inventory updates, order, fulfillment, settlement and fees or refunds. |
| C. SaaS | Build and test software, verified sandbox deployment, account access, subscriptions, operating checks and recovery. |
| D. Newsletter or memberships | Content publishing, signup and subscriber operations, scheduled work, billing where supported. |
| E. Services and lead generation | Offer, landing page, consent-aware lead and CRM records, authorized follow-up, service delivery and invoice workflow. |
| E2. Affiliate | Approved program link, published content, attribution and verifiable test commission through a suitable provider. Mark blocked if a provider has no supported test flow. |
| F. Unfamiliar income model | No starter blueprint, researched alternatives, new registered type, missing capability handling, approved integration and provider action. |
| G. Persistence | Continue across logout, worker restart and reconnect. Verify lease recovery, uncertain response reconciliation and no duplicate action. |
| H. Learning | Show that a measured result changed the next decision. Cover successful, failed and insufficient-evidence outcomes. |
| I. Payments and finance | Test checkout, renewal, cancellation, refund, dispute, failed renewal and payout. Replay duplicates and out-of-order events and verify currency, fees, totals and entitlement history. |
| J. Authority and isolation | Verify all four ASH levels, revocation, disconnect, emergency stop, user/business isolation, payload bounds and generated content isolation. |
| Platform release | Canonical HTTPS, deep links, WSS, signup, verified email, reset, logout, credits, quotas, readiness, worker capacity, monitoring and alert receipt, backup/restore/rollback, browsers, accessibility, mobile and advertised voice. |

Publish the capability catalog from the action registry with examples, supported providers and readiness, permissions and proof. Mark unverified features explicitly. Open public signup and billing together only after the release checklist and acceptance matrix pass.

## Owner actions and dependencies

1. Supply access to the private Replit project and domain controls or export the deployed revision/configuration and a protected database snapshot. Preserve local Replit work. Apply domain changes through the authorized owner account if access cannot be delegated.
2. Confirm GitHub visibility and rotate exposed bootstrap, admin and OpenRouter credentials through authorized secret stores. Confirm session invalidation. Plan any encryption key change with migration of existing encrypted credentials.
3. Provision separate staging credentials for OpenRouter and enabled search, email, voice, Stripe and other test providers. Complete Stripe Connect and provider-admin consent or identity checks. Use test modes for acceptance and configure production signing secrets securely.
4. Supply access to the separate Unreal project, compatible character/animation assets and signing accounts for supported native distribution.
5. Decide legal ownership, custody and controls before enabling ASH's independent economy with real assets. Complete identity, provider agreements and bank authorizations personally where required.
6. Confirm the exact release candidate, evidence and recovery window before opening registration and billing.

## Historical implementation plan

The earlier delivery phases below record the scope originally approved. Use the current phases and capability table above for sequencing and status.

Each item ships as its own PR off `main`, with tests, a green CI run, and no production deploy. Effort is in Devin sessions (about one engineer-week each). "Owner" marks steps only the repo/Replit owner can do.

## Phase 1: Security (PR #1, in review)

Done in code: secrets removed from tracked files, helmet, per-user AI rate limit on provider-spending routes, 5xx redaction, parameterized SQL, dependency patches, runbook.

Owner steps:
- Rotate or delete `ADMIN_BOOTSTRAP_TOKEN`.
- Reset admin passwords.
- Make the repos private.
- Optionally purge git history.

Remaining:
- **1a. Zod 3 to 4 upgrade** across `lib/api-zod`, generated code and route validators. Fixes the last high vulnerability. Effort 0.5. Depends on 2e (reproducible codegen) so the generated code can be regenerated rather than hand-edited.
- **1b. Authorization sweep.** Table-driven test that hits every mutating route as anonymous, as a user, and as another tenant. Asserts 401/403/404 and never another tenant's data. Effort 0.5.

## Phase 2: Reliability and infrastructure (PRs #2, #3, in review)

Done: service-worker deep links, duplicate index, `/analytics`, typecheck, stale test, honest health scores, versioned migrations + baseline tooling, tracked `scheduler_state`, idempotent tool/skill seeds, CI.

Remaining:
- **2a. Owner:** back up the Replit database, apply `manual-migrations/0001`, run `db:baseline`.
- **2b.** Switch `scripts/post-merge.sh` to `db:migrate`. Depends on 2a. Effort <0.1.
- **2c. Backup/restore drill.** Script `pg_dump` and restore into a scratch database, run migrate + smoke test against it, document RPO/RTO. Effort 0.2.
- **2d. Blueprint seed.** Needs the owner to export production blueprints or confirm a canonical list. Effort 0.1 once data exists.
- **2e. Reproducible Orval codegen.** Fix the duplicate `UpdatePlatformContextBody` and add a CI check that codegen output is committed. Effort 0.3.
- **2f. Single-runner guard for worker/scheduler.** Postgres advisory lock so autoscaled replicas don't double-run jobs. Effort 0.2.

## Phase 3: ASH core (backend). Starts after Phases 1–2 merge

Order matters: each step uses the one before it.

1. **3a. Close OpenRouter bypasses.** Images, transcription and admin calls go through `lib/openrouter.ts` so credits and usage are recorded. Refresh `models.ts` IDs. Record the served model for streams. Owner decision needed on the TTS/STT exception. Effort 0.3.
2. **3b. Native tool calling.** Replace the `SBEP_DATA` text block with JSON-schema'd OpenRouter tools, keeping the same action names and executors. Keep the text parser as a fallback for models without tool support. Tests: each action round-trips, malformed calls are rejected, and a failed tool call is recovered from. Effort 1.0.
3. **3c. One coordinator.** Fold executive-brain's project/goal/task resolution into the orchestrator as a pre-step. `/executive-brain/stream` stays as a compatible alias. `planning-engine` becomes the single planner that writes persisted, executable task graphs. Owner decision on the Build 015–057 surfaces: wire, freeze, or keep read-only. Effort 1.0–1.5.
4. **3d. Specialist agents on the job queue.** Research, Finance, Marketing and Operations as tool-using workers. Each has a declared tool allowlist, a permission scope and an input/output contract, runs as a durable job, and gates risky actions through `approvals.ts`. Includes delegation, conflict resolution between agent outputs, retries and duplicate prevention. Effort 2–3.
5. **3e. Outcome records and learning.** Every executed step stores expected vs actual results (revenue, health, task completion). Memory-engine gains embeddings (pgvector) and becomes the single retrieval API. Repeated-mistake detection runs over outcomes. Effort 1.5.
6. **3f. Scheduled research.** A scheduler sub-task that runs research jobs per business. Results are stored as evidence records with sources, separating facts from assumptions. Effort 0.5.

## Phase 4: Execution surface

- **4a. Authorized computer use.**
  - Device registration and auth.
  - Per-device permission grants, plus revoke.
  - Emergency stop.
  - Disconnected-device handling.
  - Builds on `lib/browser` and approvals.
  - Effort 2.
- **4b. Command-center contract.**
  - WebSocket event schema and a `/command-center/context` snapshot endpoint, both fed by the coordinator.
  - Prerequisite for any 3D/Unreal client.
  - Effort 1.

## Phase 5: Command center and digital human

Blocked on the Unreal project and owner choices. Visual work starts only after 4b is stable. See the audit report §4 for the hybrid web-3D/Unreal design.

## Phase 6: Universal autonomous business creation (owner directive, 2026-11-18)

Extends the existing platform; nothing is replaced. Phases A–C (Empire, ASH Control, Missions) and #33 are the base.

| Stage | Scope | Builds on | Status |
|---|---|---|---|
| 6.1 Goal Engine + Income Missions | Parse income goals (target, budget, timeline, constraints); research and compare 3–5 opportunities, including types outside the registry; plan for owner approval; approval creates the business (and a custom business type if needed) and a mission whose steps are the plan's milestones; mission dashboard with verified revenue, recorded spend, net, progress to target, blockers, next actions. `income_plans` table, `ash_missions.plan_id`, `plan_income_mission` ASH tool, `/api/income-plans`, `/api/missions/:id/dashboard`. | ash-missions, empire/business-types, empire/overview, research chain | In progress |
| 6.2 Capability discovery | Registry of what ASH can do (tools, connectors, adapters); check each plan against it; capability requests; declarative custom API integrations from provider docs, sandbox-tested, owner-approved, then reusable. No arbitrary code execution or platform code changes. | capability-planning, capability-intelligence, adapter-framework, connectors | Done: registry (`lib/capabilities`), plan checks, capability requests, Capabilities page; declarative custom integrations (`lib/custom-integrations`): draft → read-only sandbox test → owner approval, host-locked, SSRF-guarded. |
| 6.3 Venture Factory | Every created business gets workspace, ledger, assigned AI employees (specialists), business memory and a persistent mission. | 6.1, empire, specialists | Done: `lib/ventures`: workspace, business memory (seeded from the approved plan), AI employee team (pausable; activity recorded on delegation), ledger (verified revenue, ASH spend, owner expenses, net), missions; Venture panel on each business, team on the mission dashboard. |
| 6.4 Launch adapters | Sites, stores, products, domains, email, social on outside services (Phase D/E). | 6.2 | Part 1 done: `lib/launch` — `launch` tool runs an allow-list of 10 connector actions (WordPress pages/posts, Shopify products/collections, Beehiiv, Mailchimp, X, LinkedIn, Cloudflare deploy) server-side with the owner's credentials, also inside missions; policy kind per action; launched items saved to the Asset Vault; Launch tools card on Capabilities. Domains and stores beyond Shopify remain. |
| 6.5 Adaptive intelligence + learning | Underperformance reviews that adjust pricing, marketing, funnels within ASH Control; reuse of proven strategies and capabilities. | 6.1–6.4, ash-brain | Part 1 done: `lib/strategy-reviews` (table `strategy_reviews`, migration 0009): weekly scheduled and on-demand reviews of each income mission's verified revenue, net and milestones against its target (verdict on_track / behind / no_data; no revenue is ever estimated), up to 5 new steps that skip ones already pending; auto-applied on Operator/Autopilot, otherwise owner applies/dismisses on the mission dashboard; `review_strategy` ASH tool. Remaining: reuse of proven strategies across businesses. |
| 6.6 Treasury / ASH economy | Design only until the owner decides legal entity and custody. | Phase F | Blocked on owner |
| 6.7 Acceptance | Sandbox run of "I want to make $5,000 per month…" plus one unregistered business type; sandbox results never shown as real revenue. | all | Planned |

## Decisions needed from the owner

1. Secret rotation and making the repos private (Phase 1).
2. Baseline the Replit database (2a) and provide blueprint data (2d).
3. TTS/STT provider exception to the OpenRouter-only rule (3a).
4. Executive Brain and Builds 015–057: consolidate into the orchestrator (recommended), wire up as-is, or freeze (3c).
5. Test credentials (OpenRouter, Stripe test mode) so AI flows can be verified end to end.
