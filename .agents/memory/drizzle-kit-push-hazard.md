---
name: drizzle-kit push hazard in this project
description: Why drizzle-kit push must not be run to completion here, and what to do instead for schema changes.
---

Running `drizzle-kit push` (interactively or non-interactively) in this project is dangerous: it has offered to **drop `scheduler_state`**, a real, live table that stores scheduler recovery state (loaded on every api-server boot — see "Scheduler state loaded from DB" in startup logs).

**Why:** `scheduler_state` was created directly via raw SQL at some point in the project's history rather than through a Drizzle schema file, so it isn't part of Drizzle's tracked schema. `drizzle-kit push` diffs the DB against the Drizzle schema and treats anything it doesn't recognize as drift to reconcile — for a table, that means offering to drop it. This is pre-existing drift, unrelated to any one feature; it will resurface any time `push` runs, not just during governance/BI work.

**How to apply:** Do not run `drizzle-kit push` to completion in this project until `scheduler_state` is either formally added to the Drizzle schema or explicitly reconciled some other way (out of scope for ad hoc feature work — flag it rather than fixing it inline). Instead, apply schema changes by hand:
1. Write the exact SQL yourself (`ALTER TABLE ... ADD COLUMN`, backfill `UPDATE`s, `ALTER COLUMN ... SET NOT NULL`, etc.).
2. Run it via the database skill's `executeSql` — wrap multi-statement migrations in a single `BEGIN; ... COMMIT;` call (no `params`) for atomicity, per the database skill's multi-statement guidance.
3. Verify the result against `information_schema.columns` (and row counts / NULL counts before enforcing constraints) rather than trusting `push`'s diff.
4. Update the corresponding Drizzle schema file (`.ts`) to match by hand, so the ORM's static types agree with the DB reality — this order (DB first, verified, then schema file) avoids ever depending on `push` to reconcile the two.

This is the same technique used to safely add and then NOT-NULL-enforce the Business Intelligence governance `ownerUserId` columns across 11 tables without touching `scheduler_state`.
