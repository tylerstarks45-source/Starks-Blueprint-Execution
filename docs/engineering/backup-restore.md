# Database backup and restore

Scripts live in `scripts/db/` and need the PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) at the same major version as the server (16). Replit's `postgresql-16` module provides them.

Connection URLs are only read from the environment and handed to the client tools as `PG*` variables, so passwords never appear in process arguments. Archives carry no owners or grants: run restores as the role the application connects with (on Replit that is the `DATABASE_URL` role, which owns every table).

| Command | What it does |
|---|---|
| `pnpm --filter @workspace/scripts run db:backup [file]` | `pg_dump` custom-format archive of `$DATABASE_URL` (default `scripts/backups/sbep-<UTC>.dump`, git-ignored), then checks the archive is readable. |
| `RESTORE_TARGET_URL=<url> CONFIRM_RESTORE=<db name> pnpm --filter @workspace/scripts run db:restore <file>` | Replaces the target's `public` and `drizzle` schemas with the archive, so tables added after the backup are removed too. Refused unless `CONFIRM_RESTORE` names the target database. Takes a safety backup of the target first (`backups/pre-restore-<db>-<UTC>.dump`, or `$SAFETY_BACKUP_DIR`), drops both schemas, then restores in one transaction; if that fails the target is empty and the script prints the command that puts the safety backup back. |
| `pnpm --filter @workspace/scripts run db:drill` | Backs up `$DATABASE_URL`, restores into a scratch database `restore_drill_<ts>` on the same server (or `$DRILL_TARGET_URL`), compares exact row counts for every table in `public` and `drizzle`, then drops the scratch database (`KEEP_DRILL_DB=1` keeps it). Fails on any difference. |

CI runs the drill on every PR against the freshly migrated and seeded database.

## Before a risky change (migration, baseline, bulk data fix)

```bash
pnpm --filter @workspace/scripts run db:backup
```

Copy the archive off the machine (Replit storage is not a backup location).

## Recovering production

1. Take a backup of the current state first, even if it is broken.
2. Restore into a scratch database and check it: `createdb sbep_check && RESTORE_TARGET_URL=<url-of-sbep_check> CONFIRM_RESTORE=sbep_check pnpm --filter @workspace/scripts run db:restore <file>`.
3. Restore over production: `RESTORE_TARGET_URL="$DATABASE_URL" CONFIRM_RESTORE=<db name> pnpm --filter @workspace/scripts run db:restore <file>`.

## Drill on Replit

Run `pnpm --filter @workspace/scripts run db:drill` monthly. If the database role cannot `CREATE DATABASE` (some managed Postgres plans), create an empty database in the provider console and set `DRILL_TARGET_URL` to it.
