## MODIFIED Requirements

### Requirement: Server-computed balance

The account balance SHALL be computed by the system as
`opening balance + net transaction contribution`, where income adds its
amount, expense subtracts it, a transfer subtracts from the source account
and adds to the destination account, and an adjustment adds its signed
amount. Clients never send the balance; updates to transactions are
reflected in the computed balance.

#### Scenario: Balance after transactions

- **WHEN** an account with opening balance 10000 receives an income transaction of 2500 and an expense transaction of 400
- **THEN** the account's balance is 12100

#### Scenario: Transfer moves value between accounts

- **WHEN** a transfer of 3000 is created from account A to account B
- **THEN** account A's balance decreases by 3000 and account B's balance increases by 3000

#### Scenario: Reconciliation via adjustment transaction

- **WHEN** the user reconciles an account whose computed balance is 12000 by creating an adjustment transaction of -500
- **THEN** the account's balance is 11500

### Requirement: Limited mutability

Updating an account SHALL allow changing only its name. The currency and
opening balance SHALL NOT be changeable after creation. An update request
that changes no fields SHALL be rejected.

#### Scenario: Rename an account

- **WHEN** the user renames an account
- **THEN** the name changes and currency, opening balance, and computed balance semantics are unchanged

## REMOVED Requirements

### Requirement: Manual adjustment

**Reason**: Replacing semantics (edit a stored correction value that
silently replaces the previous one) confused users, left no audit trail of
who changed a balance when and by how much, and duplicated what
transactions already express. Balance corrections are now first-class
`adjustment` transactions with history, authorship, and sync semantics.

**Migration**: No data migration is required (no production data carries a
nonzero manual adjustment). The `manualAdjustment` field is removed from
the API, database, sync payloads, and clients; balance corrections are
performed by creating adjustment transactions.
