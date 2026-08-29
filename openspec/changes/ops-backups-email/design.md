## Context

`service.Mailer` (`SendVerificationCode`/`SendPasswordResetToken`/
`SendHouseholdInvitation`) is interface-complete with a log-only default;
the config layer has env-tag plumbing; the prod compose (deploy-vps) runs
`db`+`api`+`web` with named volumes. Nothing backs up the database today.

## Goals / Non-Goals

- Goals: real email delivery without choosing a vendor; backups that
  survive both bad migrations and a lost VPS; a restore path proven once.
- Non-Goals: email templates/branding (plain text stays), delivery status
  tracking/retries beyond the relay's queue, alerting on backup failure
  (observability stage), backup encryption at rest (single-user VPS,
  volume perms; revisit if threat model grows).

## Decisions

1. **SMTP via Go stdlib `net/smtp`, no new dependency.** Config:
   `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASSWORD`,
   `SMTP_FROM`, `SMTP_TLS` = `starttls` (default) | `implicit` (465-style,
   `tls.Dial`) | `none`. Plain-text bodies, one mail per call, `From`
   header from config. Alternatives: a mail library (gomail etc.) —
   rejected: three simple text emails don't justify a dependency;
   provider SDKs (SES/Resend) — rejected by the provider-agnostic goal
   (any SMTP relay works, incl. Resend's SMTP endpoint).
2. **Selection at wiring, best-effort preserved.** `cmd` builds
   `smtpMailer` when `SMTP_HOST` is set, else the existing `logMailer`.
   The smtpMailer logs errors and always returns nil-failure semantics
   matching the stub contract (auth flows never break) — same interface,
   no service-layer change.
3. **Backup sidecar is its own tiny image** (`deploy/backup/`): alpine +
   `postgresql17-client` (pg_dump) + `rclone`, crond-run, `/app/backup.sh`.
   Runs as a `backup` service in the prod compose on the db network,
   mounting `backups_data:/backups`. Env: `DATABASE_URL` (pointing at the
   db service), `BACKUP_RETENTION_DAILY=7`, `BACKUP_RETENTION_WEEKLY=4`,
   `RCLONE_REMOTE` (empty = warn), `BACKUP_SCHEDULE` (cron, default
   `0 3 * * *` UTC). Alternatives: `pg_back`/`wal-g` — rejected: WAL
   archiving is overkill for a family-scale single Postgres and pulls S3
   coupling; host-cron on the VPS — rejected: config lives in the compose,
   not on the machine.
4. **Logical dumps, gzip, timestamped names**
   (`expense-YYYYmmdd-HHMMSS.sql.gz`), `pg_dump -Fc`-style custom format
   vs plain SQL: plain gzipped SQL chosen — trivially inspectable and
   restorable with `gunzip | psql`, no pg_restore version coupling.
5. **Retention in shell**: keep the newest N daily-named dumps plus the
   newest dump per ISO week up to M weeks. ~10 files total — a find/sort
   pipeline beats any archive-catalog tooling.
6. **Off-site via rclone** (already in the image): after a successful dump,
   `rclone copy /backups <RCLONE_REMOTE>` when configured; absent → one
   warning line per run. The rclone remote itself is configured at first
   boot via runbook (`rclone config create` with env-provided
   credentials) — target agnostic (S3, b2, another box over sftp).
7. **CI**: the backup image joins the workflow as a third build/push
   (same tag vocabulary as api/web).

## Risks / Trade-offs

- [SMTP credentials in the VPS `.env`] → same protection as DB creds;
  example file documents rotation.
- [Dump window grows past nightly slot at family+ scale] → dataset is
  megabytes; revisit (WAL/PITR) only if restore-time objectives appear.
- [Silent backup rot] → runbook includes a monthly manual `rclone ls` /
  restore spot-check; real alerting deferred to the observability stage.
- [rclone remote misconfigured at boot] → first run warns; `backup.sh`
  exits non-zero on dump failure so `docker logs` shows it plainly.

## Migration Plan

No data migration. Deploy: pull the new backup image; the service starts,
warns (or uploads) on first run depending on rclone config. Rollback:
previous compose without the `backup` service; dumps already on the volume
are untouched plain files.

## Open Questions

- SMTP provider choice (any relay) and the rclone target are operator
  first-boot decisions — deliberately env, not repo, state.
