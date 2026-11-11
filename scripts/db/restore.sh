#!/usr/bin/env bash
# Usage: scripts/db/restore.sh <archive.dump> <target-database-url>
# Restores a backup.sh archive into the target database in a single transaction
# (all-or-nothing). Existing objects in the archive are dropped and re-created.
# Restoring over $DATABASE_URL itself requires CONFIRM_RESTORE=<target database name>.
set -euo pipefail
archive="${1:?usage: restore.sh <archive.dump> <target-database-url>}"
target="${2:?usage: restore.sh <archive.dump> <target-database-url>}"
[[ -f "$archive" ]] || { echo "No such archive: $archive" >&2; exit 1; }

db_name() { local u="${1%%\?*}"; echo "${u##*/}"; }
target_db=$(db_name "$target")

if [[ -n "${DATABASE_URL:-}" && "$target" == "$DATABASE_URL" && "${CONFIRM_RESTORE:-}" != "$target_db" ]]; then
  echo "Refusing to overwrite the live database ($target_db)." >&2
  echo "Take a fresh backup first, then re-run with CONFIRM_RESTORE=$target_db." >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction --exit-on-error \
  --dbname="$target" "$archive"
echo "Restored $archive into $target_db" >&2
