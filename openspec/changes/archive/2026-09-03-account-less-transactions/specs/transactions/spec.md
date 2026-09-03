## MODIFIED Requirements

### Requirement: Transaction types and reference shape

The system SHALL support four transaction types: `income`, `expense`,
`transfer`, and `adjustment`. Income and expense transactions SHALL
reference exactly one category, MAY reference exactly one account, and
SHALL carry a positive amount; an income or expense transaction with no
account reference («Без счета») SHALL be valid. Transfer transactions SHALL
reference exactly one source (`from`) and one destination (`to`) account,
SHALL NOT reference a category, and SHALL carry a positive amount.
Adjustment transactions SHALL reference exactly one account, SHALL NOT
reference a category or any transfer account, and SHALL carry a nonzero
signed amount (negative lowers the account balance, positive raises it).
The reference shapes SHALL be mutually exclusive; a request mixing or
omitting the required references, or violating the amount sign rule for its
type, SHALL be rejected as invalid.

#### Scenario: Income transaction with account and category

- **WHEN** the user creates an income transaction with an amount, an account, and a category
- **THEN** the transaction is stored with those references and contributes its amount to that account's balance

#### Scenario: Expense without an account

- **WHEN** the user creates an expense transaction with an amount and a category but no account reference
- **THEN** the transaction is stored with no account reference and is valid; it contributes to no account balance and appears in listings and period/category analytics like any expense

#### Scenario: Account-less income with no category

- **WHEN** an income or expense request omits both the account and the category
- **THEN** the request is rejected with an invalid-references error: the category is required even without an account

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

- **WHEN** a transfer request includes `accountId` or `categoryId`, or a cashflow request includes `fromAccountId`/`toAccountId`, or a transfer omits one of its required accounts
- **THEN** the request is rejected with an invalid-references error and no transaction is stored

#### Scenario: Negative amount on a non-adjustment type

- **WHEN** an income, expense, or transfer request carries a negative amount
- **THEN** the request is rejected as invalid; signed amounts are allowed only for the adjustment type

## ADDED Requirements

### Requirement: Account-less cashflow semantics

An income or expense transaction without an account reference («Без
счета») SHALL contribute to no account balance and SHALL NOT change any
account's computed balance on create, update, or delete. It SHALL appear in
transaction listings and in period income/expense totals and category
breakdowns on the same terms as any other income or expense transaction.
Updates SHALL be able to set the account reference of an account-less
income/expense transaction and to clear the account reference of an
accounted one, producing the balance effect of the resulting reference set.
Account-less amounts carry no currency of their own; clients display them
in the app's default currency.

#### Scenario: Balance stays untouched

- **WHEN** the user creates, edits, or deletes an account-less expense
- **THEN** every account balance is unchanged

#### Scenario: Included in period analytics

- **WHEN** the user views the expense total or category breakdown for a period containing account-less expenses
- **THEN** those amounts are included exactly like accounted expenses

#### Scenario: Assigning an account on edit

- **WHEN** the user edits an account-less expense and selects an account
- **THEN** the update succeeds and the account's balance now includes the transaction

#### Scenario: Clearing the account on edit

- **WHEN** the user edits an accounted expense and switches it to «Без счета»
- **THEN** the update succeeds and the account's balance no longer includes the transaction
