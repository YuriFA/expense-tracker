# Transactions Specification

## Purpose

Money movement records a user creates, edits, and browses: income and
expense transactions against an account and category, and transfers
between two accounts, with idempotent creation, concurrency-safe
updates, and stable pagination.

## Requirements

### Requirement: Transaction types and reference shape

The system SHALL support three transaction types: `income`, `expense`,
and `transfer`. Income and expense transactions SHALL reference exactly
one account and one category. Transfer transactions SHALL reference
exactly one source (`from`) and one destination (`to`) account and SHALL
NOT reference a category. The two reference shapes SHALL be mutually
exclusive; a request mixing or omitting the required pair SHALL be
rejected as invalid.

#### Scenario: Income transaction with account and category

- **WHEN** the user creates an income transaction with an amount, an account, and a category
- **THEN** the transaction is stored with those references and contributes its amount to that account's balance

#### Scenario: Transfer with wrong reference pair

- **WHEN** a transfer request includes `accountId` or `categoryId`, or a cashflow request includes `fromAccountId`/`toAccountId`, or omits its required pair
- **THEN** the request is rejected with an invalid-references error and no transaction is stored

### Requirement: Referenced entities must exist, belong to the user, and match the type

Every account or category referenced by a transaction SHALL exist and
belong to the requesting user; otherwise the create or update SHALL be
rejected with a not-found error for that reference. For income and
expense transactions the category's type SHALL match the transaction
type (an income transaction requires an income category; an expense
transaction requires an expense category), otherwise the request SHALL
be rejected with a category-type-mismatch error.

#### Scenario: Category type does not match transaction type

- **WHEN** an expense transaction references an income category
- **THEN** the request is rejected with a category-type-mismatch error and no transaction is stored

#### Scenario: Referenced account belongs to another user

- **WHEN** a transaction references an account or category that exists but belongs to a different user
- **THEN** the request is rejected with a not-found error, as if the reference did not exist

### Requirement: Transfers between distinct accounts

A transfer SHALL have a source and a destination account that are
different accounts; a transfer from an account to itself SHALL be
rejected with a same-account-transfer error.

#### Scenario: Transfer to the same account

- **WHEN** the user creates a transfer whose `fromAccountId` equals its `toAccountId`
- **THEN** the request is rejected with a same-account-transfer error

### Requirement: Idempotent creation

Creating a transaction SHALL support idempotency: when the client sends
an `Idempotency-Key` with the create request, a repeated request with
the same key and the same body SHALL return the original response
without creating a second transaction. A repeated request with the same
key but a different body SHALL be rejected with an idempotency-key
mismatch error. A concurrent request with the same key while the
original is still in flight SHALL be rejected with an
idempotency-key-in-use error. Stored keys expire after 24 hours; a key
used after expiry is treated as new.

#### Scenario: Network retry with the same key and body

- **WHEN** the client retries a transaction create with the same `Idempotency-Key` and the same body
- **THEN** the original response is replayed and no duplicate transaction is created

#### Scenario: Same key, different body

- **WHEN** a create request reuses an `Idempotency-Key` whose stored request body differs
- **THEN** the request is rejected with an idempotency-key mismatch error

### Requirement: Optimistic concurrency on update

Updating a transaction SHALL require the client to send the `version`
it previously read. If the transaction was modified concurrently, the
update SHALL be rejected with a version-conflict error and the client
SHALL refetch and retry. A successful update increments the version.
An update request that changes no fields SHALL be rejected.

#### Scenario: Concurrent edit

- **WHEN** two clients update the same transaction, both sending the version they read before either write landed
- **THEN** the first update succeeds and the second is rejected with a version conflict

#### Scenario: Empty update

- **WHEN** a PATCH request contains no updatable fields (only the required version)
- **THEN** the request is rejected and the transaction is unchanged

### Requirement: Transaction type is immutable

The type of an existing transaction SHALL NOT be changeable. Updates
may modify the amount, description, occurrence timestamp, and the
references appropriate for the existing type; the effective reference
set after the update SHALL satisfy the same reference rules as
creation.

#### Scenario: Changing references of a cashflow transaction

- **WHEN** the user moves an expense transaction to a different expense category and account
- **THEN** the update succeeds if the new references are valid, and fails with a not-found or type-mismatch error if they are not

### Requirement: Deletion

A user SHALL be able to delete their own transaction. Deletion removes
the transaction's contribution from account balances. Deleting a
nonexistent or other user's transaction SHALL return not-found.

#### Scenario: Delete affects the balance

- **WHEN** the user deletes an expense transaction
- **THEN** the transaction is removed and the account's balance no longer includes its amount

### Requirement: Cursor-paginated listing

Listing transactions SHALL return them newest-first by occurrence
timestamp, with ties broken by id, in pages navigated by an opaque
cursor. The response SHALL include a cursor for the next page, which is
null when no more pages exist. The list MAY be filtered by transaction
type, account, category, and an inclusive occurrence-date range, and
the page size is bounded (default 50, maximum 100). An invalid cursor
SHALL be rejected. Only the requesting user's transactions are
returned.

#### Scenario: Paging through history

- **WHEN** the user requests the transaction list and passes the returned next-cursor on subsequent requests
- **THEN** each response returns the next page in the same order, until a response with a null next-cursor

#### Scenario: Filtering by account and date range

- **WHEN** the list request filters by account and an inclusive from/to date range
- **THEN** only that account's transactions occurring within the range are returned
