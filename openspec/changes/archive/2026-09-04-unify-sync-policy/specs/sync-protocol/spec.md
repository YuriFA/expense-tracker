## MODIFIED Requirements

### Requirement: Conflict resolution flows

Edit-versus-edit conflicts SHALL be presented to the user with both
outcomes: keep the local change (re-push against the current server
version) or take the server state (apply it locally and drop the pending
operations). Delete-versus-edit conflicts, in either direction, SHALL be
treated as conflicts whose default resolution is delete-wins: the
tombstone applies, the user is notified, and the lost edit is preserved
in the conflict record with an option to restore it as a new record with
a new id. A restore SHALL recreate the preserved local state faithfully
through the same local creation rules as any normal record of its
entity — including the transaction's type and its type-specific
references — and SHALL NOT silently substitute values that are absent or
invalid in the preserved state. When the preserved state cannot yield a
valid create payload (a required field is missing or invalid), the
restore SHALL be refused: no record is created, the conflict remains
unresolved, and the user is informed of the failure. Delete-versus-delete
SHALL be idempotent and reported as applied. No conflict SHALL be
resolved by silently discarding local changes.

#### Scenario: User keeps their edit

- **WHEN** the user chooses to keep their change on a version conflict
- **THEN** the local state is re-pushed against the server's current version and, once applied, the record becomes CLEAN

#### Scenario: User takes the server state

- **WHEN** the user chooses to take the server state on a version conflict
- **THEN** the server state is applied locally, the pending operations are dropped, and the record becomes CLEAN

#### Scenario: Deleted remotely while edited locally

- **WHEN** a record edited locally is deleted on another device and the push returns a deleted conflict
- **THEN** the user is notified, the tombstone applies by default, and the edit remains recoverable as a new record

#### Scenario: Restoring preserves the transaction's type

- **WHEN** the user restores a deleted conflict whose preserved local state is an adjustment transaction, on any device of the household
- **THEN** the new record created with a new id is an adjustment transaction carrying the preserved amount, account reference, and occurred-at date — not a coerced expense — and the conflict is marked resolved

#### Scenario: Refused restore on incomplete preserved state

- **WHEN** the user restores a conflict whose preserved local state is missing or invalid in a field required to create the entity (for example a transaction without its type-specific account reference, or an account without a currency)
- **THEN** no record is created, the conflict remains unresolved and can be retried or dismissed later, and the user is informed that the restore failed
