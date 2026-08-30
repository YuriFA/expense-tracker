# operations Specification

## Purpose
Operational duties of the running system beyond serving the API:
transactional email delivery and database backup with off-site replication
and restore.

## Requirements

### Requirement: Transactional email over SMTP

When SMTP settings are configured, the system SHALL deliver its
transactional emails — email verification codes, password-reset tokens, and
household invitation links — through the configured relay over an encrypted
connection (STARTTLS or implicit TLS per configuration). When no SMTP host
is configured, the system SHALL fall back to log-only delivery. Mailer
failures SHALL be logged and SHALL NOT fail the user-facing operation that
triggered the email.

#### Scenario: Invitation reaches the invited address

- **WHEN** a household owner sends an email invitation and SMTP is
  configured
- **THEN** the invitation email is submitted to the relay for the invitee's
  address, and the invitation API call still succeeds

#### Scenario: Password reset token is delivered

- **WHEN** a user requests a password reset and SMTP is configured
- **THEN** the reset email is submitted to the relay

#### Scenario: Mailer outage does not break the flow

- **WHEN** the relay is unreachable during a registration that issues a
  verification code
- **THEN** the registration completes and the failure is logged

#### Scenario: No SMTP host means log-only delivery

- **WHEN** the system runs without SMTP configured (local development)
- **THEN** emails are logged instead of sent, and all flows behave
  identically otherwise

### Requirement: Nightly database backup with retention

The deployment SHALL produce a gzipped logical dump of the production
database every night into the backups volume, named with its timestamp, and
SHALL prune dumps beyond the retention policy (7 most recent daily dumps
plus 4 most recent weekly dumps). Backup failures SHALL be logged.

#### Scenario: Nightly dump appears

- **WHEN** the backup schedule fires
- **THEN** a new timestamped gzipped dump exists in the backups volume and
  older dumps beyond the retention policy are removed

#### Scenario: Backup failure is visible

- **WHEN** a dump fails (database unreachable)
- **THEN** the failure is logged and the previously retained dumps remain
  intact

### Requirement: Off-site replication of backups

When an off-site target is configured, each successful dump SHALL be
replicated to that target. When it is not configured, the system SHALL
continue local-only backups and log a warning that backups are not
replicated off-site.

#### Scenario: Dump is replicated off-site

- **WHEN** a dump succeeds and an off-site target is configured
- **THEN** the dump is copied to that target

#### Scenario: Missing target warns

- **WHEN** no off-site target is configured
- **THEN** backups stay local-only and a warning is logged

### Requirement: Restorable backups

A dump produced by the backup job SHALL be restorable into a fresh
database, and the restore procedure SHALL be documented in the deployment
runbook.

#### Scenario: Latest dump restores into a fresh database

- **WHEN** an operator follows the documented restore procedure with the
  latest retained dump on a fresh, empty database
- **THEN** the restored database serves the API with the backed-up data
