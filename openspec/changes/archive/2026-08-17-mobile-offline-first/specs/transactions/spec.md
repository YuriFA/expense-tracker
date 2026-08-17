# Delta: transactions

## ADDED Requirements

### Requirement: Client-generated identifier on creation

A transaction create request MAY carry a client-generated UUID v4
identifier, and the system SHALL use it as the transaction's identifier;
this lets offline-created transactions later synchronize under their
local identifiers. A create whose identifier already exists for the user
SHALL be rejected with an already-exists error and SHALL NOT overwrite
the existing transaction. (Replay of already-applied creates is handled
by the sync protocol's operation idempotency, not by this rule.)

#### Scenario: Offline-created transaction keeps its id

- **WHEN** a transaction is created offline with client-generated identifier X and later synchronized
- **THEN** the transaction exists on the server under identifier X

#### Scenario: Duplicate client identifier

- **WHEN** a create request arrives with an identifier that already exists for the user
- **THEN** the request is rejected with an already-exists error and the existing transaction is unchanged

## MODIFIED Requirements

### Requirement: Deletion

A user SHALL be able to delete their own transaction. Deletion SHALL be
soft: the transaction is marked as deleted (a tombstone), its
contribution is removed from account balances, and it is excluded from
all listings; the tombstone is retained so synchronized devices learn of
the deletion. Deleting a nonexistent or other user's transaction SHALL
return not-found.

#### Scenario: Delete affects the balance

- **WHEN** the user deletes an expense transaction
- **THEN** the transaction is tombstoned, no longer listed, and the account's balance no longer includes its amount

#### Scenario: Other devices learn of the deletion

- **WHEN** a transaction is deleted on one device
- **THEN** other devices receive the tombstone via the change feed and their copies stop contributing to balances and listings
