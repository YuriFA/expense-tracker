# Delta: categories

## ADDED Requirements

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

### Requirement: Optimistic concurrency on update

Updating a category SHALL require the client to send the `version` it
previously read. If the category was modified concurrently, the update
SHALL be rejected with a version-conflict error and the client SHALL
refetch and retry. A successful update increments the version.

#### Scenario: Concurrent category edit

- **WHEN** two devices update the same category, both sending the version they read before either write landed
- **THEN** the first update succeeds and the second is rejected with a version conflict

## MODIFIED Requirements

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

### Requirement: Deletion guard

Deleting a category that is referenced by any transaction of the user
SHALL be rejected with a category-in-use error. A category with no
referencing transactions SHALL be deletable. Deletion SHALL be soft: the
category is marked as deleted (a tombstone) and excluded from listings;
the tombstone is retained so synchronized devices learn of the deletion.

#### Scenario: Delete a category in use

- **WHEN** the user deletes a category that has transactions
- **THEN** the deletion is rejected with a category-in-use error

#### Scenario: Deleted category disappears from listings

- **WHEN** the user deletes a category with no referencing transactions
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
