#!/bin/sh
# Nightly logical dump of the production database with retention pruning and
# optional off-site replication (capability: operations).
#
# Dumps are plain gzipped SQL (design: trivially inspectable, restorable
# with `gunzip -c | psql`, no pg_restore version coupling), named
# expense-YYYYmmdd-HHMMSS.sql.gz in UTC.
#
# Exit codes: 0 = success (rclone unset only warns), non-zero = dump or
# replication failure (visible in `docker compose logs backup`).
set -eu

log() { echo "[backup $(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAILY="${BACKUP_RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-4}"

# crond runs this with a bare environment; restore the snapshotted one.
if [ -f /app/cron.env ]; then
	while IFS= read -r -d '' kv || [ -n "$kv" ]; do
		export "$kv"
	done < /app/cron.env
fi

# iso_week maps expense-YYYYmmdd-HHMMSS.sql.gz -> ISO year-week (YYYY-Www),
# used to keep the newest dump of each week.
iso_week() {
	d=$(basename "$1" | cut -c9-16) # chars 9-16: YYYYmmdd
	ym=$(echo "$d" | cut -c1-4)
	mo=$(echo "$d" | cut -c5-6)
	dy=$(echo "$d" | cut -c7-8)
	date -u -d "$ym-$mo-$dy" '+%G-%V'
}

# prune keeps the newest $RETENTION_DAILY dumps (daily tier) plus the newest
# dump of each of the newest $RETENTION_WEEKLY distinct ISO weeks (weekly
# tier). Dumps sort lexicographically = chronologically.
prune() {
	files=$(ls -1r "$BACKUP_DIR"/expense-*.sql.gz 2>/dev/null || true)
	[ -n "$files" ] || return 0

	keep=''
	kept_daily=0
	weeks_seen=''
	kept_weeks=0

	for f in $files; do
		if [ "$kept_daily" -lt "$RETENTION_DAILY" ]; then
			keep="$keep$f
"
			kept_daily=$((kept_daily + 1))
			continue
		fi
		wk=$(iso_week "$f")
		case "$weeks_seen" in
		*"|$wk|"*) continue ;;
		esac
		if [ "$kept_weeks" -lt "$RETENTION_WEEKLY" ]; then
			weeks_seen="$weeks_seen|$wk|"
			keep="$keep$f
"
			kept_weeks=$((kept_weeks + 1))
		fi
	done

	for f in $files; do
		case "$keep" in
		*"$f"*) ;;
		*) log "prune: removing $f"; rm -f "$f" ;;
		esac
	done
}

log "starting backup: dir=$BACKUP_DIR daily=$RETENTION_DAILY weekly=$RETENTION_WEEKLY"

stamp=$(date -u '+%Y%m%d-%H%M%S')
raw="$BACKUP_DIR/.expense-$stamp.sql" # hidden: never matches the expense-*.sql.gz globs
dest="$BACKUP_DIR/expense-$stamp.sql.gz"

# Dump to a file first, then compress: without bash's pipefail, a
# `pg_dump | gzip` pipeline would hide a failed dump behind gzip's exit
# code (an empty-but-valid gz would land in retention).
# On failure, exit non-zero BEFORE pruning so every previously retained
# dump stays intact (spec: backup failure is visible, not damaging).
if ! pg_dump --no-owner --no-privileges "$DATABASE_URL" >"$raw"; then
	rm -f "$raw"
	log "ERROR: pg_dump failed; retained dumps untouched"
	exit 1
fi
if ! gzip -c "$raw" >"$dest"; then
	rm -f "$raw" "$dest"
	log "ERROR: gzip failed; retained dumps untouched"
	exit 1
fi
rm -f "$raw"

log "dump written: $dest ($(du -h "$dest" | cut -f1))"

prune

if [ -n "${RCLONE_REMOTE:-}" ]; then
	if rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE"; then
		log "replicated backups to $RCLONE_REMOTE"
	else
		log "ERROR: rclone copy to $RCLONE_REMOTE failed (local dumps intact)"
		exit 1
	fi
else
	log "WARNING: RCLONE_REMOTE is not set - backups are NOT replicated off-site"
fi

log "backup run complete"
