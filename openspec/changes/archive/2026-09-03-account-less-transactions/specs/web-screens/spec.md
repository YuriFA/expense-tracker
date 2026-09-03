## ADDED Requirements

### Requirement: Account-less option in web transaction forms

The account selector of the expense and income creation forms and of the
cashflow edit form SHALL offer a distinct «Без счета» choice alongside the
account list. With «Без счета» selected, the form SHALL NOT require an
account, the amount's currency cue SHALL show the app's default currency,
and submission SHALL persist the transaction without an account reference.
The transfer form's from/to selectors and the adjustment edit form SHALL
NOT offer the choice. Selecting «Без счета» SHALL be remembered like any
other account choice where the form remembers the last-used account.

#### Scenario: Create an account-less expense

- **WHEN** the user selects «Без счета» in the expense creation form and submits a valid amount, category, and date
- **THEN** the transaction is created without an account reference, appears in the history, and no account balance changes

#### Scenario: Edit switches an expense to «Без счета»

- **WHEN** the user edits an accounted expense and selects «Без счета»
- **THEN** the update succeeds and the transaction no longer contributes to the account's balance

#### Scenario: Transfer form unchanged

- **WHEN** the user opens the transfer creation form
- **THEN** both account selectors list only real accounts and cannot be left without an account

### Requirement: Account-less transactions in the web history and filters

Transaction rows of account-less income/expense transactions SHALL display
«Без счета» in place of the account name. The transactions screen account
filter SHALL offer a «Без счета» entry that selects account-less
transactions; combined with account entries it SHALL act as an additional
selected source, not an exclusive mode.

#### Scenario: Row displays the label

- **WHEN** the history list renders an account-less expense
- **THEN** the row shows «Без счета» where accounted rows show the account name

#### Scenario: Filter by «Без счета»

- **WHEN** the user selects «Без счета» in the transactions screen account filter
- **THEN** the list shows only transactions without an account reference
