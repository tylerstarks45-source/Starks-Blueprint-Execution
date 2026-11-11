#!/usr/bin/env bash
# Usage: scripts/db/backup.sh [output-file]
# Writes a pg_dump custom-format archive of $DATABASE_URL (default: backups/sbep-<UTC timestamp>.dump)
# and verifies the archive is readable. Prints the archive path on success.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"
source "$(dirname "$0")/lib.sh"

out="${1:-backups/sbep-$(date -u +%Y%m%dT%H%M%SZ).dump}"
mkdir -p "$(dirname "$out")"

use_db "$DATABASE_URL"
pg_dump --format=custom --no-owner --no-privileges --file="$out"
entries=$(pg_restore --list "$out" | grep -cv '^;' || true)
if [[ "$entries" -eq 0 ]]; then
  echo "Backup archive $out has no entries" >&2
  exit 1
fi
echo "Backup written: $out ($(du -h "$out" | cut -f1), $entries entries)" >&2
echo "$out"
