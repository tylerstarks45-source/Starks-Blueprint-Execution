# Phased implementation plan

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

## Decisions needed from the owner

1. Secret rotation and making the repos private (Phase 1).
2. Baseline the Replit database (2a) and provide blueprint data (2d).
3. TTS/STT provider exception to the OpenRouter-only rule (3a).
4. Executive Brain and Builds 015–057: consolidate into the orchestrator (recommended), wire up as-is, or freeze (3c).
5. Test credentials (OpenRouter, Stripe test mode) so AI flows can be verified end to end.
