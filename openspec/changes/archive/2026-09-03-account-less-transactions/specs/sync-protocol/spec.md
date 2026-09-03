## ADDED Requirements

### Requirement: Account-less cashflow over sync

A pushed upsert of an income or expense transaction without an account
reference SHALL be valid under the same per-type rules as the REST surface
(the category remains required) and SHALL be applied or conflicted like any
other transaction operation. A pulled account-less income or expense
transaction SHALL be persisted by every device of the household and served
to its local reads, with the absent account reference carried through
unchanged; such transactions contribute to no local account balance.

#### Scenario: Offline account-less expense pushes

- **WHEN** a device creates an account-less expense offline and the sync engine pushes the queued upsert
- **THEN** the operation is applied and the transaction exists on the server with no account reference

#### Scenario: Other devices receive account-less rows

- **WHEN** a device pulls a change feed containing an account-less expense
- **THEN** the transaction is persisted locally with no account reference, appears in its history and analytics, and changes no account balance

#### Scenario: Push validation parity

- **WHEN** a pushed account-less cashflow upsert omits the category or carries transfer references
- **THEN** the item is rejected with the same invalid-references semantics as the REST surface
