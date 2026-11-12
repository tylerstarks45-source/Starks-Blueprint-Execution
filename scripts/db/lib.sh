# Shared helpers for the db scripts. Source, don't execute.
_db_lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# use_db <url>: point libpq (PG* env vars) at <url> for the current shell.
# The URL goes to node via the environment, not argv. Fails on an invalid URL.
use_db() {
  local exports
  exports="$(PGENV_URL="$1" node "$_db_lib_dir/pgenv.mjs")" || return 1
  eval "$exports"
}

# db_name <url>: database name in <url>.
db_name() { local u="${1%%\?*}"; echo "${u##*/}"; }

# with_db <url> <dbname>: <url> with the database name replaced, query string kept.
with_db() {
  local base="${1%%\?*}" query=""
  [[ "$1" == *\?* ]] && query="?${1#*\?}"
  echo "${base%/*}/$2$query"
}
