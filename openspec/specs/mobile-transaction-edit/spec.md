# Mobile Transaction Edit Specification

## Purpose

Describes the mobile UI for correcting or removing an existing transaction:
opening an edit sheet from the transaction lists, the per-type form contents,
save with optimistic-concurrency, and delete with confirmation.

## Requirements

### Requirement: Transaction rows open the edit sheet

In the mobile transaction sheet lists — the "all income/expenses" lists
(Dashboard, Income screens) and the per-category lists (Dashboard, Income,
Analytics detail) — each transaction row SHALL be tappable, and a tap SHALL
open the edit sheet for that transaction.

#### Scenario: Tapping a row in the all-cashflow list

- **WHEN** the user taps a transaction row in an "all income/expenses" list sheet
- **THEN** the edit sheet opens above it, prefilled with that transaction's data

#### Scenario: Tapping a row in the per-category list

- **WHEN** the user taps a transaction row in a per-category list sheet
- **THEN** the edit sheet opens above it, prefilled with that transaction's data

### Requirement: Edit form contents per transaction type

The edit sheet SHALL show a header with the transaction type title
(Расход / Доход / Перевод), a close affordance on the left, and a delete
affordance on the right. The transaction type SHALL NOT be editable.

The form SHALL present, one field per row, top to bottom:

- the amount as a plain text input (not a custom keypad), using a
  decimal-digit keyboard;
- for expense: the debit account; for income: the credit account; for
  transfer: the source and the destination accounts (both required);
- for expense and income: the category (required); transfers have no category;
- the transaction date;
- an optional note.

Each picker row (account, category, date) SHALL open a picker sheet stacked
above the edit sheet and only change its own field.

#### Scenario: Expense form fields

- **WHEN** the edit sheet opens for an expense
- **THEN** it shows amount, debit account, category, date, and note fields, and no transfer account rows

#### Scenario: Transfer form fields

- **WHEN** the edit sheet opens for a transfer
- **THEN** it shows amount, source account, destination account, date, and note fields, and no category field

#### Scenario: Type is not editable

- **WHEN** the edit sheet is open for any transaction
- **THEN** no control in the form changes the transaction type

### Requirement: Amount input formatting

The amount input SHALL accept digits with at most one decimal separator
(locale `,` or `.`) and at most two fraction digits. While typing, the integer
part SHALL be grouped with a thin space and the record's currency SHALL be
shown as a non-editable chip beside the input (expense/income: the selected
account's currency; transfer: the source account's currency).

#### Scenario: Live grouping while typing

- **WHEN** the user types `31343,5` into the amount input
- **THEN** the input displays the integer part grouped (e.g. `31 343,5`)

#### Scenario: Prefilled amount round-trips

- **WHEN** the edit sheet opens for a transaction with amount `31343,31` major units
- **THEN** the amount input is prefilled with `31 343,31` and saving without edits keeps the minor-units amount unchanged

#### Scenario: Second decimal separator is rejected

- **WHEN** the amount value already contains a separator and the user enters another
- **THEN** the input does not accept it

### Requirement: Saving edits uses version-checked update

The Save button SHALL be enabled only when the form is valid per the
mobile-forms validation rules. Saving SHALL submit the edited fields together
with the record's current version (optimistic concurrency) through the local
repository, so an offline edit is queued for sync like any other mutation.
On success the edit sheet SHALL close and the affected lists and account
balances SHALL refresh. On failure the form SHALL surface the repository
error message and keep the entered values.

#### Scenario: Successful edit

- **WHEN** the user changes the amount and taps Save with a valid form
- **THEN** the transaction is updated locally (queued for sync), the sheet closes, and list/balance data refreshes

#### Scenario: Version conflict on save

- **WHEN** the save is rejected because the transaction was changed by another action
- **THEN** the form shows the version-conflict error and keeps the entered values

### Requirement: Delete requires confirmation

Tapping the delete affordance SHALL ask for confirmation via the platform's
native alert with a destructive confirm action. Confirming SHALL delete the
transaction through the local repository (offline-safe tombstone delete),
close the edit sheet, and refresh the affected lists and balances. Cancelling
SHALL leave the transaction and the open form unchanged.

#### Scenario: Confirmed delete

- **WHEN** the user taps delete and confirms the alert
- **THEN** the transaction disappears from the lists, balances refresh, and the sheet closes

#### Scenario: Cancelled delete

- **WHEN** the user taps delete and cancels the alert
- **THEN** the transaction is unchanged and the edit sheet stays open with its form state
