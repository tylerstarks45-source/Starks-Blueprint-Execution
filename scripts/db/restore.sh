#!/usr/bin/env bash
# Usage: RESTORE_TARGET_URL=<url> CONFIRM_RESTORE=<target db name> scripts/db/restore.sh <archive.dump>
#
# Replaces the target database's `public` and `drizzle` schemas with the archive's
# contents. Tables created after the backup are removed too, so the result matches
# the archive. Steps: (1) safety backup of the target, (2) drop both schemas,
# (3) restore in a single transaction. If (3) fails, the target is left empty and
# the script prints the command that puts the safety backup back.
# (Drop and restore can't share one transaction: on a full schema that exceeds the
# default max_locks_per_transaction.)
# CONFIRM_RESTORE must name the target database (the URL is read from the environment,
# never from argv, so the password is not visible in the process list).
#
# Run as the role the application connects with: the archive carries no owners or grants.
set -euo pipefail
archive="${1:?usage: RESTORE_TARGET_URL=<url> CONFIRM_RESTORE=<db> restore.sh <archive.dump>}"
: "${RESTORE_TARGET_URL:?RESTORE_TARGET_URL must be set}"
[[ -f "$archive" ]] || { echo "No such archive: $archive" >&2; exit 1; }
source "$(dirname "$0")/lib.sh"

target_db=$(db_name "$RESTORE_TARGET_URL")
[[ -n "$target_db" ]] || { echo "RESTORE_TARGET_URL must name a database" >&2; exit 1; }
if [[ "${CONFIRM_RESTORE:-}" != "$target_db" ]]; then
  echo "This replaces all data in database '$target_db'. Take a backup first, then re-run with CONFIRM_RESTORE=$target_db." >&2
  exit 1
fi

use_db "$RESTORE_TARGET_URL"
psql_() { psql --quiet --no-psqlrc --set=ON_ERROR_STOP=1 "$@"; }

safety="${SAFETY_BACKUP_DIR:-backups}/pre-restore-$target_db-$(date -u +%Y%m%dT%H%M%SZ).dump"
mkdir -p "$(dirname "$safety")"
pg_dump --format=custom --no-owner --no-privileges --file="$safety"
echo "Safety backup of $target_db: $safety" >&2

psql_ --single-transaction -c "SET client_min_messages = warning" \
  -c "DROP SCHEMA IF EXISTS drizzle CASCADE" -c "DROP SCHEMA IF EXISTS public CASCADE" -c "CREATE SCHEMA public"

if ! pg_restore --no-owner --no-privileges --single-transaction --exit-on-error --dbname="$PGDATABASE" "$archive"; then
  echo "RESTORE FAILED: $target_db is now empty." >&2
  echo "Put the previous data back with: RESTORE_TARGET_URL=... CONFIRM_RESTORE=$target_db $0 $safety" >&2
  exit 1
fi
echo "Restored $archive into $target_db" >&2
