## MODIFIED Requirements

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
