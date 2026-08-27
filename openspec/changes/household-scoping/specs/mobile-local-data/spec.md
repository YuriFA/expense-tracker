# Delta: mobile-local-data (household-scoped mirror wording)

## MODIFIED Requirements

### Requirement: Domain rules enforced locally

Local mutations SHALL enforce the same domain rules and error semantics
as the backend: household-unique category names, deletion guards for
accounts and categories referenced by transactions, category type
matching on cashflow transactions, distinct source and destination
accounts for transfers, and valid references. Violations SHALL be
reported with the shared machine-readable error codes. Mutating a
locally deleted (tombstoned) record SHALL be rejected with a not-found
error and SHALL NOT enqueue a sync operation.

#### Scenario: Offline deletion of an account in use

- **WHEN** the user deletes an account that local transactions reference
- **THEN** the deletion is rejected with the account-in-use error code

#### Scenario: Offline category type mismatch

- **WHEN** the user records an expense referencing an income category while offline
- **THEN** the operation is rejected with the category-type-mismatch error code

#### Scenario: Edit after local delete

- **WHEN** the user edits a record that was deleted locally and not yet synchronized
- **THEN** the operation is rejected with the not-found error code and no sync operation is queued for it
