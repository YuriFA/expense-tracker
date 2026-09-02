# Web inline account creation from the transaction form

## Why

A user without accounts cannot complete the transaction creation form: the
account selector is mandatory for every transaction kind, it offers nothing
when the list is empty, and there is no in-form affordance to fix that. The
user must abandon the dialog, find the accounts page, create an account, and
start over. Every new user hits this wall (the backend seeds categories but
never accounts), so it is the cold-start path, not an edge case. Categories
already solved the same trap with an inline "+" next to the category select.

## What Changes

- Add a "+" button next to every account selector in the web transaction
  forms: creation (expense/income cashflow form, transfer form for both the
  from and to selectors) and the edit forms (cashflow, transfer, adjustment).
- The button opens an inline create-account dialog (name + opening balance,
  default 0, fixed RUB per the ruble-only app) layered over the transaction
  dialog.
- On successful creation the dialog closes, a success toast is shown, and the
  new account is auto-selected in the selector that triggered the "+".
- The account form validation schema moves from the accounts page feature to
  `entities/account` so the inline dialog and the /accounts form share one
  source of validation rules (behavior of the /accounts form is unchanged).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-screens`: new requirement "Inline account creation from the
  transaction form" - the transaction forms SHALL offer inline account
  creation next to each account selector and SHALL auto-select the created
  account in the triggering selector.

## Impact

- `apps/web/src/entities/account` - new `NewAccountDialog` UI + the account
  create schema lifted into the entity model; exported via the slice public
  API.
- `apps/web/src/features/transaction/add` (CashflowForm, TransferForm) and
  `apps/web/src/features/transaction/edit` (CashflowEditForm,
  TransferEditForm, AdjustmentEditForm) - "+" affordance, dialog wiring,
  auto-selection.
- `apps/web/src/pages/accounts/features/add-account` - imports the schema
  from `entities/account`; the page-local schema file is removed.
- i18n locales: new keys next to the existing `addTransaction.*` /
  `addAccount.*` groups.
- No backend, OpenAPI, or shared-package changes.

## Non-goals

- Mobile app parity (deferred; the web-screens mobile parity principle is
  one-directional - mobile → web - so no conflict).
- Seeding a default account on registration/first run.
- Empty-state CTA inside the account select dropdown or auto-opening the
  create dialog when the account list is empty.
- A "new account" command-palette action.
- Refactoring the /accounts `AddAccountDialog`/`AddAccountForm` onto the new
  shared dialog (only the validation schema is shared).
