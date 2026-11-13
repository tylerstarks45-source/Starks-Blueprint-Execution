# Database migrations and seed data

Schema source of truth: `lib/db/src/schema/*.ts` (Drizzle). Versioned SQL migrations live in `lib/db/drizzle/` and are applied in order by `pnpm --filter @workspace/scripts run db:migrate`, which records each one in `drizzle.__drizzle_migrations`.

`0000_baseline.sql` is the full schema as of this change, including `scheduler_state` (now declared in `lib/db/src/schema/scheduler_state.ts`, so drizzle-kit no longer offers to drop it).

## New / empty database

```bash
export DATABASE_URL=...
pnpm --filter @workspace/scripts run db:migrate
pnpm --filter @workspace/scripts run seed   # tool catalog + skills; safe to re-run
```

## Existing database (created with `drizzle-kit push`, e.g. Replit)

Do this once, in order:

1. Back up the database: `pnpm --filter @workspace/scripts run db:backup` (see `backup-restore.md`).
2. Bring the schema up to date. On Replit, `scripts/post-merge.sh` already ran `pnpm --filter db push` after the merge. (Without push, apply `lib/db/manual-migrations/0001_health_unmeasured_and_signal_index.sql` instead; it is idempotent.)
3. `pnpm --filter @workspace/scripts run db:baseline`: records, in order, every migration whose tables already exist, without running it. It stops at the first migration whose tables are missing.
4. `pnpm --filter @workspace/scripts run db:migrate`: applies whatever step 3 didn't record (nothing, if push ran).

`db:migrate` refuses to run on a database that has tables but no migration history, so it can never try to re-create existing tables.

After step 4, change `scripts/post-merge.sh` from `pnpm --filter db push` to `pnpm --filter @workspace/scripts run db:migrate`.

## Changing the schema

1. Edit `lib/db/src/schema/*.ts`.
2. `cd lib/db && DATABASE_URL=unused pnpm exec drizzle-kit generate --name <change>` (doesn't connect to a database).
3. Review and commit the generated SQL plus `meta/`.

CI fails if the schema and migrations disagree.

## Seed data

- `seed-tools`: tool categories, tools and affiliate links from `artifacts/web/src/config/toolAffiliateLinks.js`. It now upserts by tool name. The previous version deleted every tool first, which fails, or orphans data, once users have tool selections or credentials. Re-runs refresh descriptive fields (category, description, links) but never change `activeStatus` or a link's `active` flag, so admin deactivations survive.
- `seed-skills`: inserts missing skills by slug.
- Blueprints are not seeded. The repo has no source data for them (they're created by admins in the app), so a new environment needs an export from production.
