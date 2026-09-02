# Sync Protocol Specification

## Purpose

Reliable eventual synchronization between the mobile app's local database
and the REST backend: batched push of pending operations, incremental pull
from a transactional server change-log, persistent idempotency, explicit
conflict handling with user-visible resolution, and the
anonymous-to-authenticated initial sync lifecycle.

## Requirements

### Requirement: Batched push with per-item results

The client SHALL push pending operations in batches. The server SHALL
process each operation independently and report a per-item result of
applied, conflict, or error. An update operation SHALL be applied only if
the record's current server version equals the operation's base revision;
otherwise the server SHALL return a version-conflict result together with
the current server state of the record. A partially successful batch SHALL
NOT cause the client to discard the non-applied operations.

#### Scenario: Concurrent edit from another device

- **WHEN** a pushed update carries base revision 5 but the server record is already at version 6 because another device changed it
- **THEN** the item result is a version conflict including the server's current state, and the client keeps the pending operation

#### Scenario: Partial batch outcome

- **WHEN** a batch of five operations contains two items that fail validation
- **THEN** the three valid items are applied and reported as applied, the two failed items are reported individually, and the applied items are not rolled back

### Requirement: Idempotent create semantics

For an operation with base revision 0 (a record the client believes the
server has never seen): if the record does not exist, the server SHALL
create it; if the record exists and the operation id matches a previously
applied operation, the server SHALL replay the stored result without
reapplying the change; if the record exists and the operation id is
different, the server SHALL reject the operation with an already-exists
conflict and SHALL NOT silently overwrite the stored record.

#### Scenario: Retry after a lost response

- **WHEN** a create operation is applied by the server but the response is lost, and the client retries the identical operation id
- **THEN** the server replays the original result and no duplicate record is created

#### Scenario: A different operation claims an existing record id

- **WHEN** an operation with a new operation id pushes base revision 0 for a record id that already exists on the server
- **THEN** the server rejects it with an already-exists conflict and returns the existing state

### Requirement: Persistent operation idempotency

The server SHALL durably record every applied operation id together with
its result, in the same database transaction as the mutation it applied,
so a recorded operation id always corresponds to an applied change.
Repeated delivery of an applied operation id SHALL return the stored
result without side effects, across separate connections and sessions.

#### Scenario: Duplicate delivery across batches

- **WHEN** the same operation id is delivered twice in separate batches
- **THEN** the stored result is returned both times and the change is applied only once

### Requirement: Transactional change-log with tombstones

Every server-side create, update, and delete SHALL append a change-log
entry in the same database transaction as the mutation itself, so no
committed change is ever missing from the log and no log entry exists
without its change. Change-log sequence numbers SHALL be monotonic in
commit-visibility order, so a client advancing its cursor can never skip
a change with an earlier sequence. Deletions SHALL be recorded as
tombstones, and entity listings SHALL exclude tombstoned records.

#### Scenario: No change without a log entry

- **WHEN** any account, category, transaction, debtor, debt operation, or planned payment mutation commits on the server
- **THEN** exactly one corresponding change-log entry commits in the same transaction

#### Scenario: Tombstone after delete

- **WHEN** a category is deleted on one device
- **THEN** the change-log records a tombstone, other devices learn of the deletion via pull, and listings never return the tombstoned record

### Requirement: Incremental pull by cursor

The client SHALL pull changes by presenting the last received cursor and
SHALL receive all subsequent changes in sequence order — upserts and
tombstones with their server versions — together with a next cursor,
which is null when the client is fully caught up. Pull SHALL be
paginated, and a client restarting from its stored cursor SHALL resume
exactly where it stopped.

#### Scenario: Catch-up after an offline period

- **WHEN** the device comes back online after other devices made changes and pulls with its stored cursor
- **THEN** it receives every change since the cursor in order, plus a new cursor to store

### Requirement: Pull never overwrites unconfirmed local changes

A pulled change for a locally CLEAN record SHALL replace the local state
and set both revisions to the server version. A pulled newer change for a
locally DIRTY record SHALL NOT overwrite the local state; the server
state SHALL be preserved in a persistent conflict record carrying the
entity, record id, pending operation id, base revision, server version,
local state, and server state. Conflict records SHALL survive an app
restart and SHALL NOT exist only in process memory.

#### Scenario: Server change for a clean record

- **WHEN** a pull delivers version 9 for a record with no pending local operations
- **THEN** the local record adopts the server state and both revisions equal 9

#### Scenario: Server change for a dirty record

- **WHEN** a pull delivers a newer server version for a record with a pending local operation
- **THEN** the local state is left untouched and a persistent conflict record is created holding both sides

### Requirement: Conflict resolution flows

Edit-versus-edit conflicts SHALL be presented to the user with both
outcomes: keep the local change (re-push against the current server
version) or take the server state (apply it locally and drop the pending
operations). Delete-versus-edit conflicts, in either direction, SHALL be
treated as conflicts whose default resolution is delete-wins: the
tombstone applies, the user is notified, and the lost edit is preserved
in the conflict record with an option to restore it as a new record with
a new id. Delete-versus-delete SHALL be idempotent and reported as
applied. No conflict SHALL be resolved by silently discarding local
changes.

#### Scenario: User keeps their edit

- **WHEN** the user chooses to keep their change on a version conflict
- **THEN** the local state is re-pushed against the server's current version and, once applied, the record becomes CLEAN

#### Scenario: User takes the server state

- **WHEN** the user chooses to take the server state on a version conflict
- **THEN** the server state is applied locally, the pending operations are dropped, and the record becomes CLEAN

#### Scenario: Deleted remotely while edited locally

- **WHEN** a record edited locally is deleted on another device and the push returns a deleted conflict
- **THEN** the user is notified, the tombstone applies by default, and the edit remains recoverable as a new record

### Requirement: Sync cycle ordering and triggers

A synchronization run SHALL push pending operations first, then resolve
the conflicts reported by that push, then pull server changes. User
operations SHALL never wait for a sync run to finish. Sync SHALL be
triggered opportunistically: on app start and foreground, on regained
connectivity, after local mutations, and on manual refresh. Correctness
SHALL NOT depend on sync running in the background.

#### Scenario: Ordering within a run

- **WHEN** the device regains connectivity with pending local operations while the server also has new changes
- **THEN** the local operations are pushed and their conflicts resolved before server changes are pulled

### Requirement: Initial sync and account ownership

The app SHALL be fully usable anonymously before login. At
authentication, if the local database is unowned or owned by the same
user, an initial sync SHALL push all local records as creates and pull
the complete server history from the beginning, merging by record id
(disjoint client-generated id spaces make the merge a union). If the
local data belongs to a different user, the app SHALL NOT push it and
SHALL require an explicit choice between clearing the local data and
aborting the login. Logging out SHALL keep the local data on the device.

#### Scenario: Anonymous usage then first login

- **WHEN** a user records data offline and then logs in for the first time
- **THEN** all local records are pushed to the account, the account's existing history is pulled, and both sides converge without duplicates

#### Scenario: Second user on the same device

- **WHEN** a device holding unsynchronized local data owned by user A is used to log in as user B
- **THEN** user A's data is not pushed to user B's account, and the user must explicitly clear the local data or cancel the login

### Requirement: Sync under authentication expiry

When authentication expires during a sync run, the client SHALL pause the
run, keep all pending operations and conflict records, and resume from
the same queue state after re-authentication. No operation SHALL be lost
or duplicated due to the expiry.

#### Scenario: Session expires during push

- **WHEN** a push request is rejected as unauthorized mid-run
- **THEN** the queue is unchanged, the user is asked to re-authenticate, and after login the same operations are pushed again safely

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

#### Scenario: Convergence with the user's other devices

- **WHEN** a rebased base-0 push is answered with an already-exists
  result because the same record was already delivered by the user's
  other device
- **THEN** the client adopts the server record without parking a manual
  conflict (same lineage, not an edit-versus-edit dispute)

### Requirement: Union push adopts records from memberless households

A base-0 create whose record id exists in a household with no members
(orphaned by a join or dissolution) SHALL adopt the record: the existing
row moves into the pusher's household keeping its id, and the create is
reported as applied. A base-0 create whose record id exists in a
household that still has members SHALL NOT be adopted — it is rejected
with an already-exists conflict, revealing no state to a non-member.

#### Scenario: Adopting the joiner's own orphaned records

- **WHEN** a joiner's rebased create pushes a record id that lives in
  the joiner's just-orphaned personal household
- **THEN** the server moves the row into the new household with the same
  id and reports the create as applied

#### Scenario: A live household's records are never stolen

- **WHEN** a base-0 create targets a record id belonging to a household
  that still has members (e.g. after leaving it)
- **THEN** the create is rejected with an already-exists conflict and no
  record state is revealed to the pusher

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

### Requirement: Cascading category deletion over sync

A pushed delete operation for a category MAY carry a cascade flag. On
applying a cascaded delete, the server SHALL, within the same database
transaction, tombstone the category and every non-deleted transaction of
the household referencing it, and append a change-log entry for every
tombstoned record. Devices SHALL learn of each individual transaction
tombstone through pull exactly as if the transactions had been deleted one
by one, and per-record conflict resolution (delete-wins) SHALL apply to
each of them independently. Transactions created by other devices that
reference the category and land on the server before the cascaded delete is
applied SHALL be tombstoned by the cascade as well.

#### Scenario: Pushed cascaded delete

- **WHEN** a device pushes a category delete operation carrying the cascade flag
- **THEN** the server tombstones the category and all referencing non-deleted transactions atomically, records a change-log entry for each, and the push item is reported as applied

#### Scenario: Other devices receive individual tombstones

- **WHEN** another device pulls after a cascaded delete was applied
- **THEN** it receives the category tombstone and one tombstone per deleted transaction, and applies them like any other deletions

#### Scenario: Racing transaction from another device

- **WHEN** another device pushed a transaction referencing the category and the cascaded delete arrives after that push
- **THEN** the cascade tombstones that transaction together with the rest
