## MODIFIED Requirements

### Requirement: Transaction types and reference shape

The system SHALL support four transaction types: `income`, `expense`,
`transfer`, and `adjustment`. Income and expense transactions SHALL
reference exactly one account and one category, and SHALL carry a positive
amount. Transfer transactions SHALL reference exactly one source (`from`)
and one destination (`to`) account, SHALL NOT reference a category, and
SHALL carry a positive amount. Adjustment transactions SHALL reference
exactly one account, SHALL NOT reference a category or any transfer
account, and SHALL carry a nonzero signed amount (negative lowers the
account balance, positive raises it). The reference shapes SHALL be
mutually exclusive; a request mixing or omitting the required pair, or
violating the amount sign rule for its type, SHALL be rejected as invalid.

#### Scenario: Income transaction with account and category

- **WHEN** the user creates an income transaction with an amount, an account, and a category
- **THEN** the transaction is stored with those references and contributes its amount to that account's balance

#### Scenario: Adjustment transaction contributes its signed amount

- **WHEN** the user creates an adjustment transaction of -7500 on an account
- **THEN** the transaction is stored with only that account reference and no category, and the account's balance decreases by 7500

#### Scenario: Adjustment with forbidden references

- **WHEN** an adjustment request includes `categoryId`, `fromAccountId`, or `toAccountId`, or omits `accountId`
- **THEN** the request is rejected with an invalid-references error and no transaction is stored

#### Scenario: Adjustment with a zero amount

- **WHEN** an adjustment request carries an amount of zero
- **THEN** the request is rejected with an invalid-amount error and no transaction is stored

#### Scenario: Transfer with wrong reference pair

- **WHEN** a transfer request includes `accountId` or `categoryId`, or a cashflow request includes `fromAccountId`/`toAccountId`, or omits its required pair
- **THEN** the request is rejected with an invalid-references error and no transaction is stored

#### Scenario: Negative amount on a non-adjustment type

- **WHEN** an income, expense, or transfer request carries a negative amount
- **THEN** the request is rejected as invalid; signed amounts are allowed only for the adjustment type
