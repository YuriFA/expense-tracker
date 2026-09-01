## ADDED Requirements

### Requirement: Account balance reconciliation

The web accounts screen SHALL offer a reconcile action («Сверить баланс»)
on each account. Activating it SHALL open a dialog that shows a target
balance input in the account's currency, prefilled with the account's
current computed balance, and an optional note field. The dialog SHALL
show a live preview of the computed delta while the input differs from
the current balance. Submitting SHALL create an `adjustment` transaction
carrying the delta (target minus current balance) on that account via the
regular transaction-creation endpoint, with the note as the transaction
description. When the entered target equals the current balance, the
dialog SHALL indicate that the balance is already accurate and SHALL NOT
offer submission. The reconcile dialog SHALL be the only creation surface
for adjustment transactions; the generic add-transaction flow SHALL NOT
offer an adjustment tab.

#### Scenario: Reconciling a lower actual balance

- **WHEN** an account's computed balance is 12000 and the user enters 11500 with the note «сверка наличных»
- **THEN** the preview shows that 500,00 will be deducted, and submitting creates an adjustment transaction of -500 with that description, after which the balance is 11500

#### Scenario: Reconciling a higher actual balance

- **WHEN** an account's computed balance is 1000 and the user enters 2500
- **THEN** the preview shows that 1500,00 will be added, and submitting creates an adjustment transaction of +1500

#### Scenario: Zero delta is a no-op

- **WHEN** the entered target equals the account's current balance
- **THEN** the dialog indicates the balance is accurate and creates no transaction

#### Scenario: No adjustment tab in the add-transaction flow

- **WHEN** the user opens the generic add-transaction dialog
- **THEN** it offers only income, expense, and transfer

### Requirement: Adjustment transactions in history and filters

The web transaction history SHALL render adjustment transactions with a
distinct badge («Корректировка»), their signed amount, and no category.
The transactions type filter SHALL offer adjustment as a fourth option,
and unfiltered listings SHALL include adjustment transactions by default.
Editing an existing adjustment transaction SHALL use a dedicated form
exposing the signed amount directly (not a target-balance input), the
description, the occurrence timestamp, and the account; deleting an
adjustment transaction SHALL behave like deleting any other transaction.

#### Scenario: Adjustment row in history

- **WHEN** the transaction history includes an adjustment of -500
- **THEN** the row shows the «Корректировка» badge, the amount -500,00, and no category

#### Scenario: Filtering by adjustment type

- **WHEN** the user selects the adjustment option in the type filter
- **THEN** the listing shows only adjustment transactions

#### Scenario: Editing an adjustment transaction

- **WHEN** the user edits an adjustment transaction and changes its amount from -500 to -700
- **THEN** the update succeeds and the account's balance reflects the new contribution
