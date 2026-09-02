# web-screens Delta

## ADDED Requirements

### Requirement: Inline account creation from the transaction form

Every account selector in the web transaction forms — the creation forms
(expense/income and transfer, the transfer form's from and to selectors
included) and the edit forms (cashflow, transfer, adjustment) — SHALL offer
a create-account action rendered next to the selector. Activating it SHALL
open an inline account creation dialog layered over the transaction dialog
without closing it; every value already entered in the transaction form
SHALL be preserved.

The inline dialog SHALL create an account through the same rules as the
accounts screen creation form: a required name, an opening balance in major
units that SHALL be non-negative and SHALL default to 0, and the app's
fixed creation currency (rubles). On successful creation the inline dialog
SHALL close, report success the same way the accounts screen creation does,
and the new account SHALL be immediately selectable without reloading. On
failure the dialog SHALL surface the error and stay available for retry.

After a successful inline creation the transaction form SHALL auto-select
the new account in the selector whose create-account action was used; other
selectors SHALL be left unchanged. With no accounts in the list, the
create-account action SHALL remain the visible path to completing the form
(no automatic opening, no auto-seeded account).

#### Scenario: Cold start with no accounts

- **WHEN** the user opens the transaction creation form with zero accounts
  and activates the create-account action next to the account selector
- **THEN** the inline account creation dialog opens over the transaction
  dialog, and creating an account auto-selects it in that selector, letting
  the transaction be completed without leaving the flow

#### Scenario: Mid-form creation preserves entered values

- **WHEN** the user has already entered an amount, date, or description and
  creates an account inline
- **THEN** the transaction form keeps all previously entered values and the
  new account is selected in the triggering selector

#### Scenario: Transfer form selectors

- **WHEN** the user activates the create-account action next to the from or
  the to selector of the transfer form and creates an account
- **THEN** the new account is auto-selected only in the selector whose
  action was used

#### Scenario: Edit forms

- **WHEN** the user edits a transaction and activates the create-account
  action next to an account selector
- **THEN** the inline dialog opens over the edit dialog and the created
  account is auto-selected in that selector

#### Scenario: Validation matches the accounts screen

- **WHEN** the user submits the inline dialog with an empty name or a
  negative opening balance
- **THEN** creation is rejected with the same validation behavior as the
  accounts screen creation form

#### Scenario: Creation failure is retryable

- **WHEN** the account creation request fails
- **THEN** the error is surfaced in the inline dialog, the dialog remains
  open, and the transaction form state is untouched
