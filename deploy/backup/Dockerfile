# Backup sidecar for the production database (ops-backups-email change,
# capability: operations). Ships pg_dump 17 (matches the postgres:17 server,
# pg_dump must be >= server version) plus rclone for off-site replication,
# and runs /app/backup.sh on the BACKUP_SCHEDULE cron (UTC) via crond.
FROM alpine:3.22

# ca-certificates: rclone's TLS to S3/b2/sftp targets.
RUN apk add --no-cache postgresql17-client rclone ca-certificates

COPY backup.sh entrypoint.sh /app/
RUN chmod +x /app/backup.sh /app/entrypoint.sh

# crond (busybox) stays in the foreground as PID 1; jobs write to stdout.
ENTRYPOINT ["/app/entrypoint.sh"]
