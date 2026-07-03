---
name: ASH self-improving brain
description: How ASH's persistent lesson layer distills outcomes, stays honest, and prunes/serializes safely
---

# ASH self-improving brain

A persistent knowledge layer that turns real business outcomes into durable
"lessons" (one per scope: niche / blueprint_category / tool) and injects proven
patterns back into ASH decisions.

## Core invariants (do not regress)
- **Distillation is deterministic — no AI in the distill path.** It's raw SQL
  aggregation over revenue/health/tool stacks. AI only ever consumes the lessons
  via prompt injection.
- **Honesty gate.** Confidence is a function of sample size + success ratio.
  Thin data must render as `emerging` with an explicit "too little data" caveat;
  never fabricate "proven". Empty brain → prompt fallback that forbids invented
  proven claims.
- **Best-model policy untouched.** Retrieval augments the prompt only; model
  selection stays in lib/models.ts. Improvement-pass keeps Marketplace-first,
  learned outcomes only re-weight within that.

## Two non-obvious safety mechanisms (added during review)
- **Stale-scope pruning.** Distillation upserts one row per scope but must also
  DELETE lessons whose underlying data is gone (deleted businesses/systems),
  otherwise a scope keeps claiming "proven" forever. The zero-system case must
  fall through to pruning (clear all lessons), NOT early-return.
  **Why:** without this the brain silently lies after data is removed.
- **Advisory-lock mutex around the whole run.** distillAshBrain() acquires a
  Postgres session-level `pg_try_advisory_lock` on a dedicated pooled client for
  the entire run; a concurrent run returns `{skipped:true}` instead of racing.
  **Why:** scheduler's daily pass + the manual admin POST .../brain/distill can
  fire together; select-then-delete pruning outside a lock races and can delete
  freshly-computed scopes. **How to apply:** any future select-then-mutate over
  ash_lessons must run inside this lock, and the dedicated lock client must be
  released in `finally` (it's separate from the pooled connections the queries use).
