# Delta: transactions (household scoping)

## MODIFIED Requirements

### Requirement: Referenced entities must exist, belong to the user, and match the type

Every account or category referenced by a transaction SHALL exist and
belong to the requesting user's household; otherwise the create or update
SHALL be rejected with a not-found error for that reference. For income
and expense transactions the category's type SHALL match the transaction
type (an income transaction requires an income category; an expense
transaction requires an expense category), otherwise the request SHALL be
rejected with a category-type-mismatch error.

#### Scenario: Category type does not match transaction type

- **WHEN** an expense transaction references an income category
- **THEN** the request is rejected with a category-type-mismatch error and no transaction is stored

#### Scenario: Referenced account belongs to another user

- **WHEN** a transaction references an account or category that exists but
  belongs to a different household
- **THEN** the request is rejected with a not-found error, as if the
  reference did not exist
