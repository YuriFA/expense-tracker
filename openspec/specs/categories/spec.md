# Categories Specification

## Purpose

Per-user classification of income and expense transactions, with an
icon and color, seeded with a starter set on registration and guarded
against deletion while transactions reference them.

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

### Requirement: Seed categories on registration

Registering a user SHALL NOT create categories by default: the category
list starts empty, matching the mobile product's from-scratch start.
Registration MAY create the starter set (24, covering both income and
expense) when seeding is explicitly enabled for that registration (for
example, the web signup flow). Seeded categories behave like
user-created ones (editable, deletable under the same rules).

#### Scenario: New user can categorize immediately

- **WHEN** a user registers through a flow that explicitly enables seeding
- **THEN** their category list contains the seeded starter set without any user action, so they can record transactions immediately

#### Scenario: Registration without seeding

- **WHEN** a user registers with seeding not enabled
- **THEN** their category list is empty and contains no seeded categories

### Requirement: Category type constrains transaction use

A category's type SHALL determine which transactions may reference it:
income categories for income transactions, expense categories for
expense transactions. (Transfers do not take a category.)

#### Scenario: Wrong category type on a transaction

- **WHEN** an income transaction references an expense category
- **THEN** the transaction request is rejected with a type-mismatch error

### Requirement: Updating a category

A user SHALL be able to update a category's name, type, icon, and
color. An update request that changes no fields SHALL be rejected. A
rename to a name another category of the same user already has SHALL be
rejected with an already-exists error.

#### Scenario: Rename to a taken name

- **WHEN** the user renames a category to a name that another of their categories already uses
- **THEN** the request is rejected with an already-exists error

### Requirement: Optimistic concurrency on update

Updating a category SHALL require the client to send the `version` it
previously read. If the category was modified concurrently, the update
SHALL be rejected with a version-conflict error and the client SHALL
refetch and retry. A successful update increments the version.

#### Scenario: Concurrent category edit

- **WHEN** two devices update the same category, both sending the version they read before either write landed
- **THEN** the first update succeeds and the second is rejected with a version conflict

### Requirement: Deletion guard

Deleting a category that is referenced by any transaction of the user or
by any live planned payment of the user SHALL be rejected with a
category-in-use error. A category with no such references SHALL be
deletable. Deletion SHALL be soft: the category is marked as deleted (a
tombstone) and excluded from listings; the tombstone is retained so
synchronized devices learn of the deletion.

#### Scenario: Delete a category in use

- **WHEN** the user deletes a category that has transactions
- **THEN** the deletion is rejected with a category-in-use error

#### Scenario: Delete a category referenced by a live plan

- **WHEN** the user deletes a category that a live planned payment references
- **THEN** the deletion is rejected with a category-in-use error

#### Scenario: Deleted category disappears from listings

- **WHEN** the user deletes a category with no referencing transactions or live planned payments
- **THEN** the category no longer appears in listings, and other devices learn of the deletion via the change feed

### Requirement: Listing

Listing categories SHALL return the requesting user's non-deleted
categories and MAY be filtered by type (income or expense). Tombstoned
categories SHALL NOT be returned.

#### Scenario: List expense categories

- **WHEN** the user requests categories filtered to type expense
- **THEN** only their non-deleted expense categories are returned

#### Scenario: Deleted categories are not listed

- **WHEN** the user requests the category list after deleting a category
- **THEN** the deleted category does not appear in the response
