#!/usr/bin/env bash
# Usage: scripts/db/drill.sh
# Backup/restore drill: backs up $DATABASE_URL, restores it into a scratch database
# on the same server (or $DRILL_TARGET_URL), and checks that every table in the
# public and drizzle schemas has identical row counts. The scratch database is
# dropped afterwards unless KEEP_DRILL_DB=1. Exits non-zero on any mismatch.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"
here="$(cd "$(dirname "$0")" && pwd)"
workdir="$(mktemp -d)"

with_db() { # <url> <dbname> -> url with the database name replaced, query string kept
  local base="${1%%\?*}" query=""
  [[ "$1" == *\?* ]] && query="?${1#*\?}"
  echo "${base%/*}/$2$query"
}

scratch_created=""
if [[ -n "${DRILL_TARGET_URL:-}" ]]; then
  target="$DRILL_TARGET_URL"
else
  scratch="restore_drill_$(date -u +%Y%m%d%H%M%S)"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qc "CREATE DATABASE \"$scratch\""
  scratch_created="$scratch"
  target="$(with_db "$DATABASE_URL" "$scratch")"
fi

cleanup() {
  rm -rf "$workdir"
  if [[ -n "$scratch_created" && "${KEEP_DRILL_DB:-}" != "1" ]]; then
    psql "$DATABASE_URL" -qc "DROP DATABASE IF EXISTS \"$scratch_created\"" || true
  fi
}
trap cleanup EXIT

row_counts() {
  psql "$1" -v ON_ERROR_STOP=1 -AtF '|' -c "
    SELECT table_schema || '.' || table_name,
           (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
      FROM information_schema.tables
     WHERE table_schema IN ('public', 'drizzle') AND table_type = 'BASE TABLE'
     ORDER BY 1"
}

start=$(date +%s)
archive=$("$here/backup.sh" "$workdir/drill.dump")
row_counts "$DATABASE_URL" > "$workdir/source.txt"
"$here/restore.sh" "$archive" "$target"
row_counts "$target" > "$workdir/restored.txt"

tables=$(wc -l < "$workdir/source.txt")
rows=$(awk -F'|' '{s+=$2} END {print s+0}' "$workdir/source.txt")
if ! diff -u "$workdir/source.txt" "$workdir/restored.txt" > "$workdir/diff.txt"; then
  echo "DRILL FAILED: restored database differs from source" >&2
  cat "$workdir/diff.txt" >&2
  exit 1
fi
echo "DRILL PASSED: $tables tables, $rows rows restored identically in $(( $(date +%s) - start ))s" >&2
