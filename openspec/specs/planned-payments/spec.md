# Planned Payments Specification

## Purpose

Tracks recurring expenses and incomes as planned payments: per-user rules
with a next-due date, a regularity, and a confirmation mode, where each
confirmation generates a real transaction from the plan's type, account,
and category, and the plan advances to its next occurrence.


## Requirements

### Requirement: Planned payment ownership and scoping

Every planned payment SHALL belong to exactly one user. Reading,
updating, or deleting another user's planned payment SHALL behave as if
it does not exist (not-found). Planned payment names SHALL NOT be
constrained to uniqueness: two live plans of the same user MAY share a
name (two «Netflix» subscriptions are legitimate).

#### Scenario: Another user's plan is invisible

- **WHEN** a request addresses a planned payment id owned by a different user
- **THEN** the request is rejected as not-found and no data leaks

#### Scenario: Duplicate names are legal

- **WHEN** the user creates two live planned payments both named "Netflix"
- **THEN** both plans are created and both appear in listings

### Requirement: Planned payment shape

A planned payment SHALL carry a type (`expense` or `income`), a positive
non-zero amount in minor units, an optional name, a reference to a live
account owned by the same user, a reference to a live category owned by
the same user whose type matches the plan's type, a `next_due` calendar
date, a regularity (`daily`, `weekly`, `monthly`, or `yearly`), a
confirmation mode (`manual` or `auto`), a reminder setting (`off`,
`day_before`, or `on_day`), and an optional note. A `next_due` date in
the past SHALL be accepted (the plan simply starts out overdue — a
subscription added retroactively). A request with a missing or invalid
field, a non-positive amount, or a reference to a nonexistent, foreign,
or deleted account, or to a nonexistent, foreign, deleted, or
type-mismatched category SHALL be rejected. Note handling follows the
shared optional-note rule below.

#### Scenario: Create a monthly subscription plan

- **WHEN** the user creates an `expense` plan named "Netflix" for 599,00 ₽ monthly, next due on the 5th, mode `manual`, reminder `day_before`, referencing their expense category "Развлечения" and a live account
- **THEN** the plan is created and appears in the user's expense plan list

#### Scenario: Category type mismatch rejected

- **WHEN** an `expense` plan is submitted referencing an income category
- **THEN** the request is rejected with an invalid-payload error

#### Scenario: Non-positive amount rejected

- **WHEN** a planned payment is submitted with amount 0 or a negative amount
- **THEN** the request is rejected with an invalid-payload error

#### Scenario: Past next-due date accepted

- **WHEN** the user creates a plan whose `next_due` is a date in the past
- **THEN** the plan is created and is immediately overdue

#### Scenario: Unknown or deleted account reference rejected

- **WHEN** a planned payment references an account id that does not exist, belongs to another user, or has been deleted
- **THEN** the request is rejected with an account-not-found error

### Requirement: Recurrence and next-due advancement

The plan's occurrences SHALL follow from `next_due` and the regularity.
Advancing the plan moves `next_due` exactly one period forward:

- `daily` — the next calendar day;
- `weekly` — the same weekday of the following week;
- `monthly` — the same day-of-month of the following month; when the
  target month is shorter, the occurrence falls on that month's last
  day, and later occurrences return to the anchored day (Jan 31 → Feb 28
  or 29 → Mar 31);
- `yearly` — the same month and day of the following year, with February
  29 clamping to February 28 in non-leap years.

The monthly (respectively weekly, yearly) anchor SHALL be the
day-of-month (weekday, month-and-day) of the date the user last set as
`next_due`; editing the plan's `next_due` resets the anchor to the new
date.

#### Scenario: Monthly anchor clamps and recovers

- **WHEN** a monthly plan anchored to the 31st advances from January 31
- **THEN** the next occurrence is February 28 (or 29 in a leap year), and the one after that is March 31

#### Scenario: Weekly anchor keeps the weekday

- **WHEN** a weekly plan's next due is a Tuesday and it advances
- **THEN** the next occurrence is the following Tuesday

### Requirement: Overdue semantics

An occurrence is due once its scheduled calendar day has arrived. A plan
whose next occurrence is due and unconfirmed is overdue. Confirmations
cover exactly one occurrence each: a manual confirmation creates one
transaction and advances the plan one period, leaving the plan overdue
while further missed occurrences remain; automatic execution likewise
creates one transaction per missed occurrence until `next_due` is in the
future. Occurrences SHALL NOT be skipped, merged, or collapsed into a
single catch-up transaction — missed charges are real money.

#### Scenario: Manual confirmation of a plan overdue by two months

- **WHEN** a monthly plan's next occurrence is two months overdue and the user confirms it once
- **THEN** one transaction is created, the plan advances one month, and the plan remains overdue with one missed occurrence left

#### Scenario: Occurrences are never merged

- **WHEN** any confirmation flow encounters a plan three monthly occurrences behind
- **THEN** catching up produces three separate transactions, one per occurrence

### Requirement: Manual confirmation creates a transaction

Manual confirmation SHALL be composed by the client from existing
operations — creating a transaction and updating the plan — with no
dedicated server confirmation endpoint. The created transaction SHALL
have the plan's type, account, and category; an amount that defaults to
the plan's amount and MAY be adjusted by the user before submitting; an
occurred-at date that defaults to the confirmed occurrence's scheduled
date and MAY be adjusted; and a note equal to the plan's name, or an
empty note for an unnamed plan (the category is not duplicated into the
note). A successful confirmation SHALL advance the plan one period per
the recurrence rules. Manual confirmation SHALL work offline and converge
via sync.

#### Scenario: Confirm with an adjusted amount

- **WHEN** the user confirms a 2 400,00 ₽ monthly utilities plan and edits the amount to 2 650,00 ₽ in the confirm sheet
- **THEN** a 2 650,00 ₽ expense transaction is created on the plan's account and category, and the plan advances one month

#### Scenario: Unnamed plan confirms with an empty note

- **WHEN** the user confirms a plan that has no name
- **THEN** the created transaction carries an empty note and the plan's category

#### Scenario: Confirmation works offline

- **WHEN** the user confirms a plan with no connectivity
- **THEN** the transaction and the advanced plan are stored locally and later converge via sync

### Requirement: Automatic confirmation

For each live plan with confirmation mode `auto`, the server SHALL
execute due occurrences without user action: for every missed occurrence
whose scheduled date has arrived, it SHALL create a transaction with the
plan's type, account, category, and amount, an occurred-at date equal to
the occurrence's scheduled date, and a note equal to the plan's name
(empty for unnamed plans), and SHALL advance the plan — each transaction
and its plan's advancement committed in the same database transaction
with the corresponding change-log entries appended atomically.
Execution SHALL be idempotent: a rerun after a crash or a concurrent run
creates no additional transactions. Devices receive the created
transactions and the plan updates through sync pull like any other
server-side change.

#### Scenario: Due auto plan executes while the app is closed

- **WHEN** a monthly `auto` plan's occurrence date arrives and passes without any device online
- **THEN** the server later creates the transaction and advances the plan, and each device pulling afterwards shows both the new transaction and the plan's next occurrence

#### Scenario: Auto catch-up of missed months

- **WHEN** an `auto` monthly plan is three occurrences behind when the server executes it
- **THEN** three transactions are created — one per scheduled date — and the plan's `next_due` lands on the first future occurrence

#### Scenario: Rerun is idempotent

- **WHEN** the automatic execution runs again after already advancing a plan
- **THEN** no further transactions are created for occurrences already executed

### Requirement: Optional note semantics

The optional `note` of a planned payment SHALL follow the same rule,
identical to the transaction `description` convention: on create, an
absent note means an empty string, and responses always carry the note
as a string (never null). On update, an absent field means "keep the
current value"; an explicit `null` SHALL be rejected as an invalid
payload (request schemas are never nullable); an empty string SHALL
clear the note. Notes SHALL be stored verbatim — no server-side
trimming — so a whitespace-only note is accepted and stored as-is
(clients may trim at the form layer).

#### Scenario: Clear a note with an empty string

- **WHEN** the user updates a planned payment sending `note` as an empty string
- **THEN** the note becomes empty and every other field is unchanged

#### Scenario: Null note rejected

- **WHEN** an update request sends `note` as an explicit `null`
- **THEN** the request is rejected with an invalid-payload error

#### Scenario: Absent note keeps the value

- **WHEN** an update request omits the `note` field entirely
- **THEN** the stored note is unchanged

### Requirement: Client-generated identifier on creation

A planned payment create request MAY carry a client-generated UUID v4
identifier, and the system SHALL use it as the record's identifier; this
lets offline-created plans later synchronize under their local
identifiers. A create whose identifier already exists for the user SHALL
be rejected with an already-exists error and SHALL NOT overwrite the
existing record.

The record identifier identifies the planned payment itself; a sync
mutation is identified separately by its operation id (`opId`). These
are distinct mechanisms: entity-id uniqueness governs which records may
exist; sync operation idempotency governs redelivery of the same
mutation. A replayed sync operation (same `opId`) SHALL be answered by
the existing sync idempotency mechanism — the stored applied result is
returned, no second record is created, and the replay SHALL NOT be
reported as already-exists. A new mutation with a different `opId`
claiming an existing entity id is NOT a replay and SHALL follow the
duplicate-entity conflict semantics.

#### Scenario: Offline-created plan keeps its id

- **WHEN** a planned payment is created offline with client-generated identifier X and later synchronized
- **THEN** the plan exists on the server under identifier X

#### Scenario: Duplicate client identifier

- **WHEN** a create request arrives with an identifier that already exists for the user
- **THEN** the request is rejected with an already-exists error and the existing record is unchanged

#### Scenario: Replayed sync operation is idempotent

- **WHEN** a sync push delivers the same `opId` for a planned payment create that the server already applied
- **THEN** the stored applied result is replayed, no second plan is created, and the result is not already-exists

#### Scenario: Different operation id claiming an existing entity id

- **WHEN** a sync push delivers a create with a new `opId` but an entity id that already exists for the user
- **THEN** the item is reported as an already-exists conflict carrying the server's current state, and the stored record is not overwritten

### Requirement: Updating a planned payment

A user SHALL be able to update a plan's amount, name, note, account,
category, `next_due`, regularity, confirmation mode, and reminder. The
plan's type SHALL be immutable: an update attempting to change it SHALL
be rejected. Reference and shape validation SHALL follow the create
rules (a live account; a live type-matched category). An update that
changes no fields SHALL be rejected.

#### Scenario: Type change rejected

- **WHEN** an update request attempts to change a plan's type from `expense` to `income`
- **THEN** the request is rejected with an invalid-payload error

#### Scenario: Re-pointing the account

- **WHEN** the user updates a plan to reference a different live account
- **THEN** the update succeeds and future confirmations use the new account

#### Scenario: No-op update rejected

- **WHEN** an update request changes no fields
- **THEN** the request is rejected with an invalid-payload error

### Requirement: Optimistic concurrency on update

Updating a planned payment SHALL require the client to send the
`version` it previously read (REST PATCH bodies and sync upserts alike;
sync upserts carry it as the base version). If the record was modified
concurrently, the update SHALL be rejected with a version-conflict error
and the client SHALL refetch and retry. A successful update increments
the version.

#### Scenario: Concurrent plan edit

- **WHEN** two devices update the same plan, both sending the version they read before either write landed
- **THEN** the first update succeeds and the second is rejected with a version conflict

### Requirement: Deletion rules

Deleting a planned payment SHALL always be allowed — a plan has no child
records, and transactions previously created from it SHALL remain
untouched. Deletion SHALL be soft: the plan is marked as deleted (a
tombstone) and excluded from listings; the tombstone SHALL be retained
so synchronized devices learn of the deletion. A deleted plan's pending
reminders and future automatic executions stop.

#### Scenario: Delete a plan

- **WHEN** the user deletes a planned payment that has already produced transactions
- **THEN** the plan disappears from listings, other devices learn of the deletion via the change feed, and the created transactions remain

#### Scenario: Deleting an overdue plan stops everything

- **WHEN** the user deletes an overdue `auto` plan before the server executes it
- **THEN** no transaction is created for its missed occurrences

### Requirement: Versioned delete and tombstone semantics

Deleting a planned payment SHALL be a versioned mutation: a successful
delete sets the deletion timestamp and increments the `version` exactly
once, and the change-log tombstone records that new version. These
semantics inherit the existing synced-entity behavior verbatim:

- REST delete carries no version parameter (identical to accounts,
  categories, and transactions); deleting a missing or already-deleted
  record behaves as not-found.
- REST update of a tombstoned record behaves as not-found (deleted equals
  not-found).
- Sync delete is idempotent and delete-wins: a record the server never
  saw is reported as applied with version 0; an already-tombstoned record
  is reported as applied with its current version; a live record is
  tombstoned and reported as applied with the new version. A concurrent
  edit SHALL NOT turn a sync delete into a version conflict.
- Sync upsert against a record deleted on the server is reported as a
  deleted-conflict carrying the server state, resolved by the sync
  protocol's delete-wins flow.

#### Scenario: Successful versioned delete

- **WHEN** the server deletes a planned payment at version 3
- **THEN** the record's version becomes 4 with the deletion timestamp set, and the change-log tombstone records version 4

#### Scenario: Update of a deleted plan

- **WHEN** a REST update targets a planned payment that has been deleted
- **THEN** the request is rejected as not-found

#### Scenario: Delete of an already-deleted plan

- **WHEN** a REST delete targets an already-deleted planned payment, and a sync delete is delivered for the same plan
- **THEN** the REST delete is rejected as not-found, while the sync delete is reported as applied with the tombstone's current version

### Requirement: Listing

Listing planned payments SHALL return the requesting user's non-deleted
plans and MAY be filtered by type (expense or income). Tombstoned plans
SHALL NOT be returned.

#### Scenario: List expense plans only

- **WHEN** the user requests planned payments filtered to type `expense`
- **THEN** only that user's non-deleted expense plans are returned

#### Scenario: Deleted plans are not listed

- **WHEN** the user requests the list after deleting a plan
- **THEN** the tombstoned plan does not appear in the response

### Requirement: Sync participation

Planned payments SHALL be first-class sync entities: every server-side
mutation — including the plan advancement performed by automatic
confirmation — SHALL append to the change log in the same transaction
(deletes as tombstones); sync push SHALL apply creates, updates, and
deletes with the same validation and ownership rules as the REST API,
under base-version compare-and-swap semantics; sync pull SHALL deliver
planned payment upserts and tombstones so devices converge.

A planned payment pushed for an account or category that is not among
the user's live records (for example, the category was deleted on
another device while the plan was recorded offline) SHALL be reported as
a per-item error with an account-not-found or category-not-found code.
Per the sync protocol's per-item result rules, the plan SHALL NOT be
applied and SHALL NOT be silently discarded: it stays queued on the
device, is retried under the standard backoff, does not become a sync
conflict, and the user's data is preserved until the user edits or
deletes the plan locally — the same handling a transaction referencing a
remotely deleted account or category receives today.

#### Scenario: Plan created offline converges

- **WHEN** a planned payment is created offline on the mobile app and later synchronized
- **THEN** the plan exists on the server under its client-generated id, and another device pulling the changes shows it with the same next-due date

#### Scenario: Plan advancement from automatic confirmation converges

- **WHEN** the server's automatic confirmation advances a plan and creates a transaction
- **THEN** devices pulling afterwards receive both the plan upsert and the new transaction, with no possibility of confirming the same occurrence twice

#### Scenario: Offline plan referencing a deleted category

- **WHEN** a device records a planned payment offline referencing category X, category X is deleted and synchronized by another device, and the offline device then pushes the plan
- **THEN** the push yields a per-item category-not-found error, the plan is not applied but remains queued and retried per the sync protocol's backoff without entering conflict resolution, and no data is lost silently
