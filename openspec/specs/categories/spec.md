# Categories Specification

## Purpose

Per-user classification of income and expense transactions, with an
icon and color, seeded with a starter set on registration and guarded
against deletion while transactions reference them.

## Requirements

### Requirement: Category ownership and scoping

Every category SHALL belong to exactly one user. Reading, updating, or
deleting another user's category SHALL behave as if it does not exist
(not-found). Category names are unique per user; a duplicate name for
the same user SHALL be rejected with an already-exists error.

#### Scenario: Duplicate name for the same user

- **WHEN** the user creates a category named "Food" and already has one named "Food"
- **THEN** the request is rejected with an already-exists error

#### Scenario: Same name for different users

- **WHEN** two different users each create a category named "Food"
- **THEN** both categories are created independently

### Requirement: Category shape

A category SHALL have a name, a type (`income` or `expense`), an icon,
and a color. A request with a missing or invalid field SHALL be
rejected.

#### Scenario: Create a category

- **WHEN** the user creates an expense category with name, icon, and color
- **THEN** the category is created and is available for selecting on expense transactions

### Requirement: Seed categories on registration

Registering a user SHALL create a starter set of default categories
(24, covering both income and expense) owned by that user, so a new
user can record transactions immediately. Seeded categories behave like
user-created ones (editable, deletable under the same rules).

#### Scenario: New user can categorize immediately

- **WHEN** a user registers
- **THEN** their category list contains the seeded starter set without any user action

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

### Requirement: Deletion guard

Deleting a category that is referenced by any transaction of the user
SHALL be rejected with a category-in-use error. A category with no
referencing transactions SHALL be deletable.

#### Scenario: Delete a category in use

- **WHEN** the user deletes a category that has transactions
- **THEN** the deletion is rejected with a category-in-use error

### Requirement: Listing

Listing categories SHALL return the requesting user's categories and
MAY be filtered by type (income or expense).

#### Scenario: List expense categories

- **WHEN** the user requests categories filtered to type expense
- **THEN** only their expense categories are returned
