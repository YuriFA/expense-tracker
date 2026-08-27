## REMOVED Requirements

### Requirement: Balances summary and net worth

**Reason**: The endpoint summed minor units across currencies into a
single net-worth figure, which is incorrect for mixed-currency accounts,
and no client consumes it - both apps compute per-currency totals
client-side from the account listing. The contract keeps no
cross-currency aggregate until multi-currency defines conversion.

**Migration**: Clients needing a balance summary use the account listing
(`GET /accounts`) and sum balances per currency locally. None exist
today.

## MODIFIED Requirements

### Requirement: Deletion guard

Deleting an account that is referenced by any transaction of the user
(including as a transfer source or destination) or by any live planned
payment of the user SHALL be rejected with an account-in-use error. An
account with no such references SHALL be deletable. Deletion SHALL be
soft: the account is marked as deleted (a tombstone) and excluded from
listings; the tombstone is retained so synchronized devices learn of the
deletion.

#### Scenario: Delete an account with history

- **WHEN** the user deletes an account that has transactions
- **THEN** the deletion is rejected with an account-in-use error and the account remains

#### Scenario: Delete an account referenced by a live plan

- **WHEN** the user deletes an account that a live planned payment references
- **THEN** the deletion is rejected with an account-in-use error

#### Scenario: Deleted account disappears from summaries

- **WHEN** the user deletes an account with no referencing transactions or live planned payments
- **THEN** the account no longer appears in listings and other devices learn of the deletion via the change feed
