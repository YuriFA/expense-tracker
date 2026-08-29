## Why

Two launch gaps remain after deploy: the mailer is a log-only stub, so
email household invitations, password reset, and email verification are
silently non-functional in production (recorded in `docs/assumptions.md`);
and the production database has no backups — the only copy lives on the
VPS.

## What Changes

- SMTP mailer implementation (Go stdlib `net/smtp`) selected by env:
  `SMTP_HOST/PORT/USER/PASS/FROM` + `SMTP_TLS` mode. With `SMTP_HOST` set,
  verification codes, password-reset tokens, and household invitations are
  delivered through the relay; unset, the current log-only stub stays (dev
  default). Best-effort semantics unchanged: mailer failures are logged and
  never break auth or invitation flows.
- Backup sidecar in `docker-compose.prod.yml`: a small image
  (`deploy/backup/`) with `pg_dump` + `rclone`; nightly gzipped dump into a
  volume, retention (7 daily + 4 weekly), off-site copy via rclone when
  `RCLONE_REMOTE` is configured, warning-only otherwise.
- Restore procedure in `docs/deployment.md` plus a local smoke test proving
  a dump restores into a fresh database.
- `docs/assumptions.md`: prune "Email delivery provider is unchosen"
  (resolved: provider-agnostic SMTP env).

## Capabilities

### New Capabilities
- `operations`: production email delivery and database backup/restore —
  the operational duties of the running system beyond serving the API.

### Modified Capabilities

None.

## Impact

- **Backend**: new SMTP mailer + wiring in `cmd` (env-selected factory);
  no domain/service changes; no OpenAPI change.
- **Deployment**: new `deploy/backup/` image (third CI artifact), new
  `backup` service in `docker-compose.prod.yml` (shares the db network,
  mounts a backups volume), `.env.production.example` gains SMTP and
  rclone variables.
- **Depends on**: `deploy-vps` (the prod compose and registry layout this
  change extends).
- **VPS**: operator picks an SMTP provider (any relay — Resend/SES/Yandex/
  any SMTP) and an rclone remote at first boot; both are env-only.
