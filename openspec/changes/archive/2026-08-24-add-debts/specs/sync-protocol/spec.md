## MODIFIED Requirements

### Requirement: Transactional change-log with tombstones

Every server-side create, update, and delete SHALL append a change-log
entry in the same database transaction as the mutation itself, so no
committed change is ever missing from the log and no log entry exists
without its change. Change-log sequence numbers SHALL be monotonic in
commit-visibility order, so a client advancing its cursor can never skip
a change with an earlier sequence. Deletions SHALL be recorded as
tombstones, and entity listings SHALL exclude tombstoned records.

#### Scenario: No change without a log entry

- **WHEN** any account, category, transaction, debtor, or debt operation mutation commits on the server
- **THEN** exactly one corresponding change-log entry commits in the same transaction

#### Scenario: Tombstone after delete

- **WHEN** a category is deleted on one device
- **THEN** the change-log records a tombstone, other devices learn of the deletion via pull, and listings never return the tombstoned record
