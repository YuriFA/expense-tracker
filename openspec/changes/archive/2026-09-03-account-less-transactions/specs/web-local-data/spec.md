## ADDED Requirements

### Requirement: Account-less cashflow in the local mirror

Local creation and update of an income or expense transaction without an
account reference SHALL be accepted with the same domain rules as the
backend (the category remains required and type-matched; no account
existence check applies). The queued sync operation for such a mutation
SHALL carry the absent account reference and SHALL NOT be held back as a
local error. A pulled account-less cashflow transaction SHALL persist with
the absent account reference intact and be served to every local read.

#### Scenario: Offline account-less expense

- **WHEN** the user creates an account-less expense while offline
- **THEN** the transaction is stored locally, its queued upsert is valid, and it appears in history and period analytics without changing any account balance

#### Scenario: Pull applies an account-less row

- **WHEN** the sync pull delivers an account-less income transaction
- **THEN** the local mirror stores it without an account reference and serves it to subsequent reads

#### Scenario: Clearing the account locally

- **WHEN** the user edits an accounted expense locally and switches it to «Без счета»
- **THEN** the local row loses its account reference, the queued upsert carries the cleared reference, and the account's local balance no longer includes the transaction
