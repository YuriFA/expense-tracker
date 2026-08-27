# Delta: sync-protocol (household rebase and authorship)

## ADDED Requirements

### Requirement: Household rebase on membership change

When a device's household changes (the user joins another household),
the client SHALL rebase its local state before operating against the new
household's stream: per-record server-version bookkeeping SHALL be reset
to zero, the pull cursor SHALL be reset to zero, pending operations
SHALL be regenerated wholesale as create operations for all surviving
records, and local tombstones SHALL be dropped (their deletes are
meaningless in the new household). After the rebase, the initial-sync
union applies unchanged: push-all-as-creates with idempotent-create
semantics, pull-from-zero merging by record id.

#### Scenario: Rebase carries records into the new household

- **WHEN** a device with synchronized records joins a new household and
  chooses to carry its data
- **THEN** every surviving local record is pushed as a create with base
  revision 0 and the household ends up containing those records with the
  same ids

#### Scenario: Rebase is idempotent

- **WHEN** the rebase runs more than once before the first
  synchronization
- **THEN** the resulting state (zeroed versions and cursor, regenerated
  create operations, no tombstones) is the same

#### Scenario: No stale operations cross households

- **WHEN** operations were frozen in flight at the moment of the join
- **THEN** the rebase replaces the outbox wholesale and no operation
  from the old household is ever pushed to the new one

### Requirement: Change payloads carry authorship

Pull changes SHALL include the author's user id, stamped by the server
from the session that applied the operation; records created before
authorship tracking may report its absence. The push direction SHALL
NOT accept authorship from clients — the server is the sole authority.

#### Scenario: Pulling a sibling's record

- **WHEN** a member pulls a change created by another member
- **THEN** the change identifies the author's user id

#### Scenario: Client-sent authorship is ignored

- **WHEN** a pushed operation includes an author field
- **THEN** the server records the authenticated pusher as the author
