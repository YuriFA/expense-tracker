## MODIFIED Requirements

### Requirement: Planned payment ownership and scoping

Every planned payment SHALL belong to exactly one household. Reading,
updating, or deleting a planned payment of a household the requester does
not belong to SHALL behave as if it does not exist (not-found). Planned
payment names SHALL NOT be constrained to uniqueness: two live plans of
the same household MAY share a name (two «Netflix» subscriptions are
legitimate).

#### Scenario: Another user's plan is invisible

- **WHEN** a request addresses a planned payment id owned by a household the requester does not belong to
- **THEN** the request is rejected as not-found and no data leaks

#### Scenario: Duplicate names are legal

- **WHEN** the user creates two live planned payments both named "Netflix"
- **THEN** both plans are created and both appear in listings

### Requirement: Planned payment shape

A planned payment SHALL carry a type (`expense` or `income`), a positive
non-zero amount in minor units, an optional name, a reference to a live
account of the same household, a reference to a live category of the same
household whose type matches the plan's type, a `next_due` calendar
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

- **WHEN** a planned payment references an account id that does not exist, belongs to another household, or has been deleted
- **THEN** the request is rejected with an account-not-found error

#### Scenario: Past next-due date accepted

- **WHEN** the user creates a plan whose `next_due` is a date in the past
- **THEN** the plan is created and is immediately overdue

#### Scenario: Non-positive amount rejected

- **WHEN** a planned payment is submitted with amount 0 or a negative amount
- **THEN** the request is rejected with an invalid-payload error
