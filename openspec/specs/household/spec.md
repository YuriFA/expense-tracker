# household Specification

## Purpose
The shared-data-space model of the product: every user belongs to exactly
one household, all shared records belong to the household rather than to
individual members, and membership controls access.

## Requirements

### Requirement: Automatic personal household

Every user SHALL belong to exactly one household, of which they are the
owner. Existing users are migrated automatically; new registrations create
their household implicitly. No user action is required to obtain a
household, and v1 exposes no way to hold more than one membership.

#### Scenario: Existing account after the migration

- **WHEN** the system upgrades with existing users
- **THEN** each user is the owner of exactly one household containing all
  of their existing records, with no data loss

#### Scenario: New registration

- **WHEN** a new user registers
- **THEN** a household owned by that user is created together with the
  account

### Requirement: Household-scoped data access

Accounts, categories, transactions, debtors, debt operations, and planned
payments SHALL belong to a household. A household's members SHALL see and
modify all of the household's data equally. Requests addressing a record
of a household the requester is not a member of SHALL behave as if the
record does not exist (not-found, no data revealed).

#### Scenario: Member sees a sibling's record

- **WHEN** a member lists or reads a record created by another member of
  the same household
- **THEN** the record is returned like any other household record

#### Scenario: Non-member gets not-found

- **WHEN** a request addresses a record id belonging to a household the
  requester does not belong to
- **THEN** the response is not-found with no data revealed

### Requirement: Uniqueness within the household

Names that are unique per user before this change (category names, debtor
names) SHALL be unique within the household among non-deleted records;
duplicates within the same household are rejected, while equal names
across different households coexist.

#### Scenario: Duplicate name inside a household

- **WHEN** any member creates a category (or debtor) whose name duplicates
  a non-deleted one in the same household
- **THEN** the request is rejected with an already-exists error

#### Scenario: Same name across households

- **WHEN** two users from different households each create a category
  named "Food"
- **THEN** both are created independently

### Requirement: Household and members listing

An authenticated endpoint SHALL return the requester's household with its
members: email, display name (when set), role, and joined date.

#### Scenario: Reading own household

- **WHEN** an authenticated user requests their household
- **THEN** the response lists every member with email, display name (or
  absence), role, and joined date

### Requirement: User display name

A user SHALL have an optional display name, editable through the profile
endpoint; it carries no access-control meaning and is intended for
member-facing labels (e.g. record authorship). When absent, consumers fall
back to the email.

#### Scenario: Setting and changing the display name

- **WHEN** the user sets a display name and later changes it
- **THEN** both operations succeed and the household members listing
  reflects the current value

#### Scenario: No display name set

- **WHEN** a user has never set a display name
- **THEN** the members listing reports its absence and consumers fall back
  to the email
