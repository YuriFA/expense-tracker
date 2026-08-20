# Mobile Local Data Specification

## Purpose

The mobile app's on-device data layer: a local database is the source of
truth for the UI, user operations work fully offline through the shared
repository contracts, and every mutation leaves a persistent pending
operation for later synchronization with the backend.

## Requirements

### Requirement: Local database is the source of truth

The mobile app SHALL store accounts, categories, and transactions in an
on-device database. All reads and writes by the app SHALL go through that
database, and the UI SHALL NOT depend on network availability to display
or modify data.

#### Scenario: Fresh install with no connectivity

- **WHEN** the app starts for the first time with no network connection
- **THEN** the user can create accounts, categories, and transactions, and all data is retained after an app restart

### Requirement: User operations never require the network

Every create, update, delete, and list operation SHALL complete locally
and update the UI immediately. The success of a user operation SHALL NOT
depend on connectivity or on any backend response.

#### Scenario: Create a transaction in airplane mode

- **WHEN** the user creates an expense transaction while offline
- **THEN** the transaction is stored locally, the visible balances update immediately, and the operation succeeds without any network exchange

### Requirement: Domain rules enforced locally

Local mutations SHALL enforce the same domain rules and error semantics
as the backend: per-user unique category names, deletion guards for
accounts and categories referenced by transactions, category type
matching on cashflow transactions, distinct source and destination
accounts for transfers, and valid references. Violations SHALL be
reported with the shared machine-readable error codes. Mutating a
locally deleted (tombstoned) record SHALL be rejected with a not-found
error and SHALL NOT enqueue a sync operation.

#### Scenario: Offline deletion of an account in use

- **WHEN** the user deletes an account that local transactions reference
- **THEN** the deletion is rejected with the account-in-use error code

#### Scenario: Offline category type mismatch

- **WHEN** the user records an expense referencing an income category while offline
- **THEN** the operation is rejected with the category-type-mismatch error code

#### Scenario: Edit after local delete

- **WHEN** the user edits a record that was deleted locally and not yet synchronized
- **THEN** the operation is rejected with the not-found error code and no sync operation is queued for it

### Requirement: Version and sync state per record

Each stored record SHALL carry a local logical revision (`version`) and
the last server-confirmed revision (`server_version`). A record SHALL be
CLEAN iff the two are equal and DIRTY iff the local revision is greater.
A local mutation SHALL increment only the local revision. When the server
confirms a pushed operation, the server-confirmed revision SHALL be set
to the revision returned by the server; if other pending operations
remain for the record, the record stays DIRTY, otherwise the local
revision is set equal to the confirmed revision and the record is CLEAN.

#### Scenario: Offline edits keep the record dirty

- **WHEN** a record confirmed at server revision 5 is edited twice offline
- **THEN** its local revision is 7, its server-confirmed revision is 5, and it is DIRTY

#### Scenario: Clean after the last confirmation

- **WHEN** the last pending operation for a record is confirmed with server revision 7
- **THEN** the server-confirmed revision and the local revision both equal 7 and the record is CLEAN

#### Scenario: Coalesced confirmation realigns the local revision

- **WHEN** three offline edits (local revision 8, server-confirmed revision 5) are pushed as a single coalesced operation and the server confirms it at revision 6
- **THEN** the local revision is set to 6 to match the server-confirmed revision and the record is CLEAN, not left dirty at 8 despite the queue being empty

### Requirement: Pending operation for every mutation

Every local create, update, or delete SHALL atomically persist both the
record change and a pending sync operation in a single database
transaction. A pending operation SHALL carry a unique operation id, the
entity and record id, the operation kind (upsert or delete), the full
record payload, and the base revision captured at creation time (the
last server-confirmed revision when the operation is created, never the
local revision).

#### Scenario: Mutation and queue write are atomic

- **WHEN** a mutation is interrupted before the sync operation is durably recorded
- **THEN** neither the record change nor the queued operation exists; a changed record never exists without its pending operation

#### Scenario: Base revision is captured at creation

- **WHEN** an operation is created while the server-confirmed revision is 5 and the record is later edited again, raising the local revision to 7
- **THEN** the operation still carries base revision 5

### Requirement: Confirmed operations are removed individually

The sync queue SHALL remove exactly those operations the server confirmed
as applied, matched by operation id. An operation created while an
earlier operation for the same record is still in flight SHALL remain
pending and SHALL NOT be removed by the confirmation of that earlier
operation.

#### Scenario: Edit during in-flight push

- **WHEN** operation A for a record at server-confirmed revision 5 is being pushed, the user edits the record (creating operation B), and the server confirms A as applied at revision 6
- **THEN** only A is removed from the queue, the record's server-confirmed revision becomes 6, its local revision stays 7, and B remains pending

### Requirement: Coalescing unsent operations

Before a push, multiple not-yet-sent operations for the same record SHALL
be coalesced into one operation carrying the full current record state,
the base revision of the first operation in the group, and a stable
operation id reused across retries. Operations created during an
in-flight push form a new group and are not coalesced with it. A record
created and deleted locally without ever being confirmed by the server
SHALL leave no pending operation.

#### Scenario: Three offline edits push as one operation

- **WHEN** a record is edited three times offline and then synchronized
- **THEN** a single operation containing the final state is pushed with the base revision captured before the first edit

#### Scenario: Create then delete before first sync

- **WHEN** a category is created and deleted offline before any synchronization
- **THEN** no operation for it exists in the queue and nothing is ever sent for it

### Requirement: Home screen data behavior

The home screen SHALL derive entirely from local data: total expenses for
the selected month grouped by category, the full list of expenses for the
selected month, and three balance modes — month expenses, month balance
(income minus expenses, transfers excluded), and total balance across
accounts. The selected month SHALL be the device's local calendar month:
a transaction belongs to the selected month iff its occurred-at instant
falls within that calendar month in the device's local timezone, and this
attribution SHALL be consistent across every month-scoped figure the home
screen shows (category totals, expense lists, month expenses, month
balance). The category list SHALL start empty on a fresh install, and a
category SHALL be created with a name, a type, an icon chosen from a
predefined list, and a circle background color chosen from a predefined
list.

#### Scenario: Month totals without connectivity

- **WHEN** the user opens the home screen offline after recording expenses in the selected month
- **THEN** per-category totals, the expense list, and all three balance modes are rendered from local data

#### Scenario: Transaction at a month boundary

- **WHEN** a transaction occurs at 00:30 local time on the first day of a month
- **THEN** it is attributed to the new month in every month-scoped figure on the home screen and to neither figure of the previous month

#### Scenario: Fresh install category list

- **WHEN** the app is freshly installed and the user opens the category creation sheet
- **THEN** the category list is empty and a new category can be created by choosing a name, type, icon, and color from the predefined lists
