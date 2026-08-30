#!/bin/sh
# Entrypoint for the backup sidecar: installs the BACKUP_SCHEDULE cron line
# and runs busybox crond in the foreground.
#
# crond jobs start with a minimal environment, so the runtime env (compose
# `environment:`) is snapshotted NUL-separated into cron.env, which backup.sh
# re-exports. Round-trips every practical value (quotes, spaces, *cron
# schedules*) without shell-quoting pitfalls.
set -eu

: "${BACKUP_SCHEDULE:=0 3 * * *}"
: "${BACKUP_DIR:=/backups}"

# busybox crontab installs anything and crond later SKIPS unparseable
# lines silently — validate the schedule ourselves (numeric 5-field cron,
# no @macros or day/month names) so a typo crash-loops the container
# loudly instead of never backing up.
case "$BACKUP_SCHEDULE" in
*[!0-9*,/-\ ]*) echo "ERROR: invalid BACKUP_SCHEDULE '$BACKUP_SCHEDULE' (5-field numeric cron, UTC)" >&2; exit 1 ;;
esac
[ "$(echo "$BACKUP_SCHEDULE" | wc -w)" -eq 5 ] || { echo "ERROR: invalid BACKUP_SCHEDULE '$BACKUP_SCHEDULE' (5-field numeric cron, UTC)" >&2; exit 1; }

env -0 > /app/cron.env

# Job output goes to PID 1's stdout (crond is PID 1 after exec), i.e. the
# container log. crond's own logging stays on syslog (absent in the
# container): pointing it at stderr instead (-L /dev/stderr) dumps the
# schedule bitmaps on every load — verified noise, dropped.
echo "$BACKUP_SCHEDULE /app/backup.sh >>/proc/1/fd/1 2>&1" | crontab -

mkdir -p "$BACKUP_DIR"
echo "backup sidecar ready: schedule '$BACKUP_SCHEDULE' -> $BACKUP_DIR"

# An invalid schedule is rejected above (set -e also fails `crontab -`):
# the container crash-loops loudly instead of silently never backing up.
exec crond -f -l 8
