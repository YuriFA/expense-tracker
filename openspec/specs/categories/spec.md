# Categories Specification

## Purpose

Per-user classification of income and expense transactions with an
icon and color, starting empty on registration and guarded against
deletion while transactions reference them.

## Requirements

### Requirement: Category ownership and scoping

Every category SHALL belong to exactly one household. Reading, updating,
or deleting a category of a household the requester does not belong to
SHALL behave as if it does not exist (not-found). Category names are
unique per household among non-deleted categories; a duplicate name within
the same household SHALL be rejected with an already-exists error.

#### Scenario: Duplicate name for the same user

- **WHEN** any member creates a category named "Food" and the household
  already has a non-deleted category named "Food"
- **THEN** the request is rejected with an already-exists error

#### Scenario: Same name for different users

- **WHEN** two users from different households each create a category
  named "Food"
- **THEN** both categories are created independently

### Requirement: Category shape

A category SHALL have a name, a type (`income` or `expense`), an icon,
and a color. A request with a missing or invalid field SHALL be
rejected.

#### Scenario: Create a category

- **WHEN** the user creates an expense category with name, icon, and color
- **THEN** the category is created and is available for selecting on expense transactions

### Requirement: Client-generated identifier on creation

A category create request MAY carry a client-generated UUID v4
identifier, and the system SHALL use it as the category's identifier;
this lets offline-created categories later synchronize under their local
identifiers. A create whose identifier already exists for the user SHALL
be rejected with an already-exists error and SHALL NOT overwrite the
existing category. (Replay of already-applied creates is handled by the
sync protocol's operation idempotency, not by this rule.)

#### Scenario: Offline-created category keeps its id

- **WHEN** a category is created offline with client-generated identifier X and later synchronized
- **THEN** the category exists on the server under identifier X

#### Scenario: Duplicate client identifier

- **WHEN** a create request arrives with an identifier that already exists for the user
- **THEN** the request is rejected with an already-exists error and the existing category is unchanged

### Requirement: Category type constrains transaction use

A category's type SHALL determine which transactions may reference it:
income categories for income transactions, expense categories for
expense transactions. (Transfers do not take a category.)

#### Scenario: Wrong category type on a transaction

- **WHEN** an income transaction references an expense category
- **THEN** the transaction request is rejected with a type-mismatch error

### Requirement: Updating a category

A user SHALL be able to update a category's name, type, icon, color, and
archived-at timestamp. Setting the archived-at timestamp archives the
category; clearing it unarchives it. Updating an archived category's name,
type, icon, or color SHALL be allowed. An update request that changes no
fields SHALL be rejected. A rename to a name another non-deleted category
of the household already has (active or archived) SHALL be rejected with an
already-exists error. Archiving a category that is referenced by any live
planned payment of the household SHALL be rejected with a category-in-use
error.

#### Scenario: Rename to a taken name

- **WHEN** the user renames a category to a name that another of their categories already uses
- **THEN** the request is rejected with an already-exists error

#### Scenario: Rename to a name held by an archived category

- **WHEN** the user renames an active category to the name of an archived category
- **THEN** the request is rejected with an already-exists error

#### Scenario: Archive via update

- **WHEN** the user updates a category, setting its archived-at timestamp
- **THEN** the category is archived and no longer offered for new transactions

#### Scenario: Unarchive via update

- **WHEN** the user updates an archived category, clearing its archived-at timestamp
- **THEN** the category is active again and offered for new transactions

#### Scenario: Archive blocked by a live planned payment

- **WHEN** the user archives a category that a live planned payment references
- **THEN** the request is rejected with a category-in-use error

#### Scenario: Edit an archived category

- **WHEN** the user renames an archived category or changes its icon or color
- **THEN** the update succeeds and existing transactions display the updated labeling

### Requirement: Optimistic concurrency on update

Updating a category SHALL require the client to send the `version` it
previously read. If the category was modified concurrently, the update
SHALL be rejected with a version-conflict error and the client SHALL
refetch and retry. A successful update increments the version.

#### Scenario: Concurrent category edit

- **WHEN** two devices update the same category, both sending the version they read before either write landed
- **THEN** the first update succeeds and the second is rejected with a version conflict

### Requirement: Deletion guard

Deleting a category that is referenced by any live planned payment of the
household SHALL be rejected with a category-in-use error, regardless of a
cascade flag. Deleting a category referenced by transactions but by no live
planned payment SHALL be rejected with a category-in-use error UNLESS the
request explicitly carries a cascade flag, in which case the category and
every non-deleted transaction of the household referencing it SHALL be
tombstoned atomically in one transaction. Transactions tombstoned by the
cascade SHALL follow the normal transaction-deletion semantics, including
the effect on account balances. Any member of the household SHALL be allowed
to perform a cascaded delete. A category with no such references SHALL be
deletable without a cascade flag. Deletion SHALL be soft: tombstoned
categories are excluded from listings; the tombstones (category and, when
cascaded, transactions) are retained so synchronized devices learn of the
deletions.

#### Scenario: Delete a category in use

- **WHEN** the user deletes a category that has transactions, without the cascade flag
- **THEN** the deletion is rejected with a category-in-use error

#### Scenario: Cascaded delete tombstones referencing transactions

- **WHEN** the user deletes a category with the cascade flag and the category is referenced by 12 transactions but by no live planned payment
- **THEN** the category and all 12 transactions are tombstoned atomically, account balances reflect the removed transactions, and other devices learn of every deletion via the change feed

#### Scenario: Delete a category referenced by a live plan

- **WHEN** the user deletes a category that a live planned payment references, with or without the cascade flag
- **THEN** the deletion is rejected with a category-in-use error

#### Scenario: Cascaded delete by a non-owner member

- **WHEN** a household member who is not the owner performs a cascaded delete
- **THEN** the deletion succeeds under the same rules as for the owner

#### Scenario: Deleted category disappears from listings

- **WHEN** the user deletes a category with no referencing transactions or live planned payments
- **THEN** the category no longer appears in listings, and other devices learn of the deletion via the change feed

### Requirement: Listing

Listing categories SHALL return the requesting household's non-deleted
active categories and MAY be filtered by type (income or expense).
Tombstoned categories SHALL NOT be returned. When the client explicitly
requests archived categories to be included, the listing SHALL also return
non-deleted categories whose archived-at timestamp is set, so management
UIs can show both. Archived categories SHALL NOT be returned by default.

#### Scenario: List expense categories

- **WHEN** the user requests categories filtered to type expense
- **THEN** only their non-deleted active expense categories are returned

#### Scenario: Deleted categories are not listed

- **WHEN** the user requests the category list after deleting a category
- **THEN** the deleted category does not appear in the response

#### Scenario: Listing includes archived on request

- **WHEN** the user requests the category list with archived categories included
- **THEN** both active and archived non-deleted categories are returned, each carrying its archived-at timestamp (null for active ones)

### Requirement: Category archive

A category SHALL carry an archived-at timestamp (null means active).
Archiving SHALL hide the category from every selection surface for future
records - the category pickers of new and edited transactions - while
existing transactions keep referencing it and analytics, history, and
period breakdowns continue to display it with its transactions. An
archived category SHALL remain editable and unarchivable and SHALL keep
reserving its name among non-deleted categories of the household.

#### Scenario: Archived category hidden from transaction pickers

- **WHEN** the user opens the category picker while creating a transaction after archiving a category
- **THEN** the archived category is not offered

#### Scenario: Archived category remains in analytics

- **WHEN** the user views the category breakdown for a period that contains transactions of an archived category
- **THEN** the archived category and its amounts are displayed

#### Scenario: Existing transactions keep their archived category

- **WHEN** the user lists transactions that reference an archived category
- **THEN** the transactions are shown with that category, unchanged

### Requirement: Archived category unavailable for new transaction references

Creating a transaction that references an archived category, or updating a
transaction's category to an archived one, SHALL be rejected with an
archived-category error. Updating a transaction that already references an
archived category without changing the category SHALL be allowed.

#### Scenario: Assign an archived category on create

- **WHEN** a transaction create request references an archived category
- **THEN** the request is rejected with an archived-category error

#### Scenario: Switch a transaction to an archived category

- **WHEN** a transaction update changes the category to an archived one
- **THEN** the request is rejected with an archived-category error

#### Scenario: Edit a transaction keeping its archived category

- **WHEN** a transaction update changes only the note and the transaction already references an archived category
- **THEN** the update succeeds and the category is preserved
