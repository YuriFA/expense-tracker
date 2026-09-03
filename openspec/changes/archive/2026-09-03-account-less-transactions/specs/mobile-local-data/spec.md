## ADDED Requirements

### Requirement: Account-less cashflow records in local data

The local mirror SHALL accept, persist, and serve income and expense
transactions without an account reference: local validation SHALL skip the
account existence check when no account is referenced (the category remains
required), pushed upserts for such records SHALL be valid, and pulled
account-less rows SHALL persist with the reference absent. Such
transactions SHALL contribute to no locally computed account balance while
remaining visible in history and period analytics. Mobile forms continue
to require an account until their own change; this requirement covers the
data layer only.

#### Scenario: Pull an account-less row on mobile

- **WHEN** the mobile device pulls a change feed containing an account-less expense
- **THEN** the transaction is stored locally, shown in history and analytics, and excluded from account balances

#### Scenario: Local validation accepts account-less cashflow

- **WHEN** a data-layer operation writes an income transaction with a valid category and no account
- **THEN** the write is accepted under the same rules as the backend
