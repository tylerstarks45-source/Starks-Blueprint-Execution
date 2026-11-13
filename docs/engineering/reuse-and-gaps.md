# Reuse, duplication and gaps

The rule is upgrade before replace. Everything below extends existing code. Nothing here proposes a new brain, memory system, scheduler, orchestrator or AI gateway.

## Reuse as-is (foundations to build on)

| System | Where | Why it is the one to keep |
|---|---|---|
| AI gateway | `lib/openrouter.ts`, `lib/models.ts` | Credit checks, usage logging and model chains already in one place. Close the remaining bypasses instead of adding another client. |
| ASH entry point | `routes/ai-orchestrator.ts` (`/api/ash/*`) | The only ASH path the UI calls. Action execution, approvals, connectors and media all go through it. |
| Durable jobs | `lib/runtime/worker.ts`, `jobs.ts`, `state-machine.ts` | DB-backed queue with retries, backoff and orphan recovery. Specialist agents and scheduled research should run as jobs here. |
| Scheduler | `lib/runtime/scheduler.ts` + `scheduler_state` | Already runs recurring work. Scheduled cloud research becomes another sub-task, not a new scheduler. |
| Approvals / governance | `lib/approvals.ts`, `lib/approval-executor.ts`, `lib/operations-gate.ts` | Human-in-the-loop gate for risky actions. Desktop/computer-use permissions should reuse it. |
| Memory | `lib/memory-engine` (5 layers, business isolation tested) | Has the most complete isolation and retrieval API. The other stores should feed it or be read through it. |
| Connectors | `lib/connectors` (registry + `execute()`), `lib/connections-hub` | Real credential decryption and execution path for third-party actions. |
| Browser automation | `lib/browser`, `routes/browser-agent.ts` (Playwright) | Starting point for authorized computer-use. |
| Revenue data | `lib/revenue/sync.ts` | Real provider sync. Supplies the MEASURE step of the Helix loop. |
| Health | `lib/health-monitor.ts` | Reports measured signals only from PR #2. Unmeasured dimensions are null. |

## Duplication (consolidate; do not add to it)

| Concern | Overlapping implementations | Proposed direction |
|---|---|---|
| Planning | `executive-brain/task-planner.ts`, `planning-engine/*`, `executive-plan`, `strategic-planning`, `operational-planning` | Make `planning-engine` the one planner that writes executable plans. The others become read-only advisors or are frozen. |
| Orchestration | `ai-orchestrator` route, `executive-brain` (forwards into it), `unified-orchestration`, `cognitive-foundation/orchestration` | One coordinator: the existing orchestrator, with executive-brain's project/goal/task resolution moved in as a pre-step. Owner decision pending. |
| Memory | `memory-engine`, `ash_lessons` (`ash-brain.ts`), `cognitive-memory`, `executive-learning` | Single retrieval API (memory-engine). The others write into it. Add embeddings there, not in a new store. |
| Tool protocol | `SBEP_DATA` text block in model output, with a "you forgot the block" retry | Native OpenRouter tool calling with JSON-schema'd actions, keeping the same action names and executors. |
| Connector UIs | Two connector screens (see `.agents/memory/duplicate-connector-uis.md`) | Frontend later. Out of scope for the backend phases. |

## Gaps against the Project Helix loop

| Loop step | Status | Gap |
|---|---|---|
| RESEARCH | Partial | `research-engine` + Perplexity via OpenRouter exist. No scheduled or recurring research. No source/evidence records that separate facts from assumptions. |
| UNDERSTAND | Partial | Business context packages exist. No structured objective model the planner consumes. |
| PLAN | Partial | Three or more planners (above). Plans are not persisted as executable task graphs with owners. |
| EXECUTE | Partial | Job worker, connectors, browser agent. No specialist agents with their own tools, permissions and contracts. No delegation. |
| MEASURE | Partial | Revenue sync and health (now honest). No per-action outcome records tying results back to the plan step. |
| LEARN | Partial | Lessons and memory writes exist. No evaluation of outcomes against expectations. No repeated-mistake detection. |
| IMPROVE | Minimal | Daily improvement pass in the scheduler. No proposal, benchmark or rollback cycle. |
| Platform | Missing | Leader election for worker/scheduler under autoscale. Shared rate-limit store. Backup/restore drill. Semantic memory. Command-center WebSocket contract. |

## Infrastructure gaps closed or opened by PRs #1–#3

- Closed in code:
  - Committed secrets removed (rotation is still the owner's job).
  - Security headers, AI rate limit, 5xx redaction, parameterized SQL.
  - 51 of 52 dependency vulnerabilities fixed.
  - Service-worker deep links, duplicate index, `/analytics` auth bug, typecheck errors.
  - Honest health scores.
  - Versioned migrations, tracked `scheduler_state`, idempotent seeds.
  - CI with Postgres.
- Still open:
  - The Zod 3 to 4 major upgrade (last high vulnerability).
  - Baselining the Replit database, then switching `post-merge.sh` to `db:migrate`.
  - Blueprint seed source data.
  - Backup/restore drill.
  - Reproducible Orval codegen.
  - Rate-limit counters are per replica.
