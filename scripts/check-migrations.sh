#!/usr/bin/env bash
# Rollback-safety guard for Postgres migrations.
#
# Rollback (docs/deployment.md, "Rollback") redeploys OLD images against
# the CURRENT schema: down-migrations never run in production. Every
# up-migration therefore has to keep the previously deployed code
# working (expand-contract: additive changes first; destructive ones
# only in a later deploy, after the old code is retired).
#
# Lint-grade by design: statement-level checks over *.up.sql. Fails on
# destructive or restrictive DDL:
#   - DROP TABLE/COLUMN/TYPE/FUNCTION/TRIGGER/VIEW/SCHEMA/DEFAULT
#   - ALTER COLUMN ... TYPE
#   - RENAME (table or column)
#   - ADD COLUMN ... NOT NULL without DEFAULT (rejects old-code inserts)
#
# Runs in CI (.github/workflows/ci.yml) and before every deploy (both
# the Makefile and deploy.yml paths).
set -euo pipefail

mig_dir="${1:-backend/internal/repository/postgres/migrations}"
[ -d "$mig_dir" ] || { echo "ERROR: migration directory not found: $mig_dir" >&2; exit 1; }

violations=0

# Migrations that predate this guard and are already applied in
# production - rewriting applied history is worse than the exemption.
# Each entry notes why. NOTE: 000007 DROPs accounts.manual_adjustment,
# which the pre-000007 code reads: rollback across the 000007 boundary
# was never safe. Irrelevant from now on - every deploy tag is post-000007.
grandfathered=(
  "000007_adjustment_transactions.up.sql"
)

is_grandfathered() { # <file-path>
  local f=$1 entry
  for entry in "${grandfathered[@]}"; do
    case "$f" in *"$entry") return 0 ;; esac
  done
  return 1
}

fail() { # <file> <rule> <statement>
  echo "ERROR: $1: $2" >&2
  echo "  >> $(printf '%s' "$3" | tr -s '[:space:]' ' ' | cut -c1-100)" >&2
  violations=1
}

shopt -s nullglob
files=("$mig_dir"/*.up.sql)
[ ${#files[@]} -gt 0 ] || { echo "ERROR: no *.up.sql migrations found in $mig_dir" >&2; exit 1; }

for file in "${files[@]}"; do
  is_grandfathered "$file" && continue
  # Strip -- comments, then split into statements on ";" (plain DDL only:
  # $$-quoted function bodies would break this split - keep migrations DDL).
  while IFS= read -r stmt; do
    [ -n "$(printf '%s' "$stmt" | tr -d '[:space:]')" ] || continue
    s=$(printf '%s' "$stmt" | tr '\n' ' ' | tr -s '[:space:]' ' ')
    sl=$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]')
    case "$sl" in
      *'drop table'*|*'drop column'*|*'drop type'*|*'drop function'*|\
      *'drop trigger'*|*'drop view'*|*'drop schema'*|*'drop default'*)
        fail "$file" "destructive DDL breaks the previously deployed code" "$s" ;;
      *'alter column'*' type'*)
        fail "$file" "ALTER COLUMN ... TYPE is not rollback-safe" "$s" ;;
      *'rename to'*|*'rename column'*)
        fail "$file" "RENAME breaks the previously deployed code" "$s" ;;
    esac
    # ADD COLUMN ... NOT NULL without DEFAULT rejects old-code inserts.
    if [[ "$sl" == *'add column'* && "$sl" == *'not null'* && "$sl" != *'default'* ]]; then
      fail "$file" "ADD COLUMN ... NOT NULL without DEFAULT rejects the previous code's inserts" "$s"
    fi
  done < <(sed 's/--.*//' "$file" | tr ';' '\n')
done

if [ "$violations" -ne 0 ]; then
  echo "Migration guard failed. Split destructive changes per expand-contract (docs/deployment.md, Rollback)." >&2
  exit 1
fi
echo "OK: up-migrations in $mig_dir are rollback-safe (additive DDL only)."
