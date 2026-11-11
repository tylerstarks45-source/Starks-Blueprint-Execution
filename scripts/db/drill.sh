#!/usr/bin/env bash
# Usage: scripts/db/drill.sh
# Backup/restore drill: backs up $DATABASE_URL, restores it into a scratch database
# on the same server (or $DRILL_TARGET_URL), and checks that every table in the
# public and drizzle schemas has identical row counts. The scratch database is
# dropped afterwards unless KEEP_DRILL_DB=1. Exits non-zero on any mismatch.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"
here="$(cd "$(dirname "$0")" && pwd)"
source "$here/lib.sh"
workdir="$(mktemp -d)"

scratch_created=""
if [[ -n "${DRILL_TARGET_URL:-}" ]]; then
  target="$DRILL_TARGET_URL"
else
  scratch="restore_drill_$(date -u +%Y%m%d%H%M%S)"
  (use_db "$DATABASE_URL"; psql --no-psqlrc --set=ON_ERROR_STOP=1 -qc "CREATE DATABASE \"$scratch\"")
  scratch_created="$scratch"
  target="$(with_db "$DATABASE_URL" "$scratch")"
fi

cleanup() {
  rm -rf "$workdir"
  if [[ -n "$scratch_created" && "${KEEP_DRILL_DB:-}" != "1" ]]; then
    (use_db "$DATABASE_URL"; psql --no-psqlrc -qc "DROP DATABASE IF EXISTS \"$scratch_created\"") || true
  fi
}
trap cleanup EXIT

row_counts() { # <url>
  (use_db "$1"; psql --no-psqlrc --set=ON_ERROR_STOP=1 -AtF '|' -c "
    SELECT table_schema || '.' || table_name,
           (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
      FROM information_schema.tables
     WHERE table_schema IN ('public', 'drizzle') AND table_type = 'BASE TABLE'
     ORDER BY 1")
}

start=$(date +%s)
archive=$("$here/backup.sh" "$workdir/drill.dump")
row_counts "$DATABASE_URL" > "$workdir/source.txt"
SAFETY_BACKUP_DIR="$workdir" RESTORE_TARGET_URL="$target" CONFIRM_RESTORE="$(db_name "$target")" "$here/restore.sh" "$archive"
row_counts "$target" > "$workdir/restored.txt"

tables=$(wc -l < "$workdir/source.txt")
rows=$(awk -F'|' '{s+=$2} END {print s+0}' "$workdir/source.txt")
if ! diff -u "$workdir/source.txt" "$workdir/restored.txt" > "$workdir/diff.txt"; then
  echo "DRILL FAILED: restored database differs from source" >&2
  cat "$workdir/diff.txt" >&2
  exit 1
fi
echo "DRILL PASSED: $tables tables, $rows rows restored identically in $(( $(date +%s) - start ))s" >&2
