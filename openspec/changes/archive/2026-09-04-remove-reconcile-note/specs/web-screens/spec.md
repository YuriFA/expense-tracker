## MODIFIED Requirements

### Requirement: Account balance reconciliation

The web accounts screen SHALL offer a reconcile action («Сверить баланс»)
on each account. Activating it SHALL open a dialog that shows a target
balance input in the account's currency, prefilled with the account's
current computed balance. The dialog SHALL show a live preview of the
computed delta while the input differs from the current balance. Submitting
SHALL create an `adjustment` transaction carrying the delta (target minus
current balance) on that account via the regular transaction-creation
endpoint with an empty description; the dialog SHALL offer no note or
description input. A user who wants a description on the adjustment SHALL
add it afterwards by editing the transaction. When the entered target
equals the current balance, the dialog SHALL indicate that the balance is
already accurate and SHALL NOT offer submission. The reconcile dialog
SHALL be the only creation surface for adjustment transactions; the
generic add-transaction flow SHALL NOT offer an adjustment tab.

#### Scenario: Reconciling a lower actual balance

- **WHEN** an account's computed balance is 12000 and the user enters 11500
- **THEN** the preview shows that 500,00 will be deducted, and submitting creates an adjustment transaction of -500 with an empty description, after which the balance is 11500

#### Scenario: Reconciling a higher actual balance

- **WHEN** an account's computed balance is 1000 and the user enters 2500
- **THEN** the preview shows that 1500,00 will be added, and submitting creates an adjustment transaction of +1500

#### Scenario: Zero delta is a no-op

- **WHEN** the entered target equals the account's current balance
- **THEN** the dialog indicates the balance is accurate and creates no transaction

#### Scenario: No adjustment tab in the add-transaction flow

- **WHEN** the user opens the generic add-transaction dialog
- **THEN** it offers only income, expense, and transfer
