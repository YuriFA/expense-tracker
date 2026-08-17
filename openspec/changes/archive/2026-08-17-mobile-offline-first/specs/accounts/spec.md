# Delta: accounts

## ADDED Requirements

### Requirement: Client-generated identifier on creation

An account create request MAY carry a client-generated UUID v4
identifier, and the system SHALL use it as the account's identifier;
this lets offline-created accounts later synchronize under their local
identifiers. A create whose identifier already exists for the user SHALL
be rejected with an already-exists error and SHALL NOT overwrite the
existing account. (Replay of already-applied creates is handled by the
sync protocol's operation idempotency, not by this rule.)

#### Scenario: Offline-created account keeps its id

- **WHEN** an account is created with client-generated identifier X, later offline, and synchronized
- **THEN** the account exists on the server under identifier X

#### Scenario: Duplicate client identifier

- **WHEN** a create request arrives with an identifier that already exists for the user
- **THEN** the request is rejected with an already-exists error and the existing account is unchanged

### Requirement: Optimistic concurrency on update

Updating an account SHALL require the client to send the `version` it
previously read. If the account was modified concurrently, the update
SHALL be rejected with a version-conflict error and the client SHALL
refetch and retry. A successful update increments the version.

#### Scenario: Concurrent account edit

- **WHEN** two clients update the same account, both sending the version they read before either write landed
- **THEN** the first update succeeds and the second is rejected with a version conflict

## MODIFIED Requirements

### Requirement: Deletion guard

Deleting an account that is referenced by any transaction of the user
(including as a transfer source or destination) SHALL be rejected with
an account-in-use error. An account with no referencing transactions
SHALL be deletable. Deletion SHALL be soft: the account is marked as
deleted (a tombstone) and excluded from listings, the balances summary,
and net worth; the tombstone is retained so synchronized devices learn
of the deletion.

#### Scenario: Delete an account with history

- **WHEN** the user deletes an account that has transactions
- **THEN** the deletion is rejected with an account-in-use error and the account remains

#### Scenario: Deleted account disappears from summaries

- **WHEN** the user deletes an account with no referencing transactions
- **THEN** the account no longer appears in listings, the balances summary, or net worth, and other devices learn of the deletion via the change feed

### Requirement: Listing

Listing accounts SHALL return all of the requesting user's non-deleted
accounts with their computed balances. Tombstoned accounts SHALL NOT be
returned.

#### Scenario: List accounts

- **WHEN** the user requests the account list
- **THEN** every account they own is returned with its current computed balance, and no other user's accounts appear

#### Scenario: Deleted accounts are not listed

- **WHEN** the user requests the account list after deleting an account
- **THEN** the deleted account does not appear in the response
