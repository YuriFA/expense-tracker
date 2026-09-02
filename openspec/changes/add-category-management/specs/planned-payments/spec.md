## MODIFIED Requirements

### Requirement: Planned payment shape

A planned payment SHALL carry a type (`expense` or `income`), a positive
non-zero amount in minor units, an optional name, a reference to a live
account owned by the same user, a reference to a live category owned by
the same user whose type matches the plan's type, a `next_due` calendar
date, a regularity (`daily`, `weekly`, `monthly`, or `yearly`), a
confirmation mode (`manual` or `auto`), a reminder setting (`off`,
`day_before`, or `on_day`), and an optional note. A live category is a
non-deleted, non-archived category. A `next_due` date in the past SHALL be
accepted (the plan simply starts out overdue — a subscription added
retroactively). A request with a missing or invalid field, a non-positive
amount, or a reference to a nonexistent, foreign, or deleted account, or
to a nonexistent, foreign, deleted, archived, or type-mismatched category
SHALL be rejected. Note handling follows the shared optional-note rule
below.

#### Scenario: Create a monthly subscription plan

- **WHEN** the user creates an `expense` plan named "Netflix" for 599,00 ₽ monthly, next due on the 5th, mode `manual`, reminder `day_before`, referencing their expense category "Развлечения" and a live account
- **THEN** the plan is created and appears in the user's expense plan list

#### Scenario: Archived category rejected

- **WHEN** a plan is submitted referencing an archived category
- **THEN** the request is rejected

#### Scenario: Category type mismatch rejected

- **WHEN** an `expense` plan is submitted referencing an income category
- **THEN** the request is rejected with an invalid-payload error

#### Scenario: Unknown or deleted account reference rejected

- **WHEN** a planned payment references an account id that does not exist, belongs to another user, or has been deleted
- **THEN** the request is rejected with an account-not-found error

#### Scenario: Past next-due date accepted

- **WHEN** the user creates a plan whose `next_due` is a date in the past
- **THEN** the plan is created and is immediately overdue

#### Scenario: Non-positive amount rejected

- **WHEN** a planned payment is submitted with amount 0 or a negative amount
- **THEN** the request is rejected with an invalid-payload error

### Requirement: Updating a planned payment

A user SHALL be able to update a plan's amount, name, note, account,
category, `next_due`, regularity, confirmation mode, and reminder. The
plan's type SHALL be immutable: an update attempting to change it SHALL
be rejected. Reference and shape validation SHALL follow the create
rules (a live account; a live, type-matched, non-archived category). An
update that changes no fields SHALL be rejected.

#### Scenario: Type change rejected

- **WHEN** an update request attempts to change a plan's type from `expense` to `income`
- **THEN** the request is rejected with an invalid-payload error

#### Scenario: Re-pointing the account

- **WHEN** the user updates a plan to reference a different live account
- **THEN** the update succeeds and future confirmations use the new account

#### Scenario: Re-pointing to an archived category rejected

- **WHEN** an update request changes the plan's category to an archived one
- **THEN** the request is rejected

#### Scenario: No-op update rejected

- **WHEN** an update request changes no fields
- **THEN** the request is rejected with an invalid-payload error
