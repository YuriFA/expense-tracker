## 1. SMTP mailer

- [x] 1.1 Config: `SMTP_HOST/PORT/USER/PASSWORD/FROM` + `SMTP_TLS`
      (`starttls`|`implicit`|`none`, default `starttls`) in
      `internal/config` with env overrides, local/prod yaml entries
- [x] 1.2 Implement the SMTP `Mailer` (stdlib `net/smtp`): STARTTLS and
      implicit-TLS modes, plain-text bodies, per-method subjects/links for
      verification code, reset token, household invitation
- [x] 1.3 Wire the factory in `cmd`: `SMTP_HOST` set → smtpMailer, else
      the existing logMailer; failures logged, never returned as flow
      errors (stub contract preserved)
- [x] 1.4 Unit tests: message construction per mail kind, TLS mode
      selection, credential/header encoding; integration (optional,
      env-gated) against a local SMTP sink if cheap to stand up

## 2. Backup sidecar

- [x] 2.1 `deploy/backup/Dockerfile`: alpine + `postgresql17-client` +
      `rclone` + crond entry running `/app/backup.sh`
- [x] 2.2 `deploy/backup/backup.sh`: `pg_dump | gzip` to
      `/backups/expense-YYYYmmdd-HHMMSS.sql.gz`; retention pruning
      (7 daily + 4 weekly); `rclone copy` when `RCLONE_REMOTE` set else
      warning; non-zero exit + log on dump failure; honors
      `BACKUP_SCHEDULE`/`BACKUP_RETENTION_*` env
- [x] 2.3 `docker-compose.prod.yml`: `backup` service (db network,
      `backups_data` volume, env from `.env`, `restart: unless-stopped`,
      log rotation); `.env.production.example` gains SMTP/rclone/backup
      variables
- [x] 2.4 CI: build+push the backup image alongside api/web (same tags)

## 3. Restore path

- [x] 3.1 Local smoke: run the backup image against a scratch Postgres,
      produce a dump, restore `gunzip | psql` into a fresh database,
      start the API against it and verify data serves
- [x] 3.2 Runbook section in `docs/deployment.md`: restore procedure,
      monthly spot-check (latest dump listed off-site + test-restore),
      rclone target setup at first boot

## 4. Docs and gates

- [x] 4.1 Prune `docs/assumptions.md` ("Email delivery provider is
      unchosen" resolved by provider-agnostic SMTP env)
- [x] 4.2 Gates: `go test -race ./...`, `make gen-check` (no contract
      drift), lint; compose config validates with the new service;
      `openspec validate ops-backups-email --strict`
