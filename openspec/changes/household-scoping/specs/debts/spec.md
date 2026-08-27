# Delta: debts (household scoping)

## MODIFIED Requirements

### Requirement: Debt ownership and scoping

Every debtor and every debt operation SHALL belong to exactly one
household. Reading, updating, or deleting a debtor or debt operation of a
household the requester does not belong to SHALL behave as if it does not
exist (not-found). Debtor names SHALL be unique per household among
non-deleted debtors; a duplicate name within the same household SHALL be
rejected with an already-exists error.

#### Scenario: Duplicate debtor name for the same user

- **WHEN** any member creates a debtor named "Анна" and the household
  already has a non-deleted debtor named "Анна"
- **THEN** the request is rejected with an already-exists error

#### Scenario: Same debtor name for different users

- **WHEN** two users from different households each create a debtor named
  "Анна"
- **THEN** both debtors are created independently

#### Scenario: Another user's debtor is invisible

- **WHEN** a request addresses a debtor id owned by a different household
- **THEN** the request is rejected as not-found and no data leaks
