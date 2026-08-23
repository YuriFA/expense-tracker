## Why

The mobile app can create transactions but neither edit nor delete them: every
mistake (wrong amount, category, account, or date) requires deleting data in
the web app. The offline data layer already supports updates (with version
CAS) and deletes (tombstones) end-to-end — only the UI is missing.

## What Changes

- Transaction rows in the sheet lists — `CashflowListSheet` ("all
  income/expenses" lists on Dashboard and Income) and `CategoryCashflowSheet`
  (per-category lists on Dashboard, Income, Analytics detail) — become
  tappable and open an edit sheet.
- New edit sheet per transaction type (Расход / Доход / Перевод): header with
  close button on the left and a delete button on the right; fields stacked
  one per row — amount as a plain text input (decimal keyboard, live digit
  grouping, currency chip), account row(s), category row (expense/income
  only), date row, note field, and a Save button. Transaction type is
  immutable (domain rule).
- Deleting a transaction asks for confirmation via the native alert, then
  performs the local soft-delete (existing repository/sync path).
- Saving edits goes through the existing local repository `update` with the
  record's `version` (optimistic concurrency; conflict surfaces as a form
  error).
- Reference screenshots drive the visual layout; reference elements with no
  domain backing (repeat/recurrence, photo attachment, transfer exchange-rate
  conversion) are out of scope.
- Enabler refactor: the prop-driven picker sheets and account selector row
  move from `features/create-transaction` to `shared/ui` so the edit slice can
  reuse them (cross-slice imports within `features/` are forbidden).

## Capabilities

### New Capabilities

- `mobile-transaction-edit`: mobile UI behavior for editing and deleting an
  existing transaction from the sheet lists — row tap targets, edit form
  fields and validation, save semantics (version CAS), delete confirmation,
  and error surfacing.

### Modified Capabilities

(none — `transactions` already specifies update/delete domain semantics;
`mobile-forms` rules apply unchanged to the new form)

## Impact

- Code: `apps/mobile` only — new `features/edit-transaction` slice; new
  `onEditTransaction` prop threaded through `features/cashflow-overview`
  sheets/cards to the hosting pages (Dashboard, Income, Analytics detail);
  picker sheets moved to `shared/ui`; new minor→input-string money helper in
  `shared/lib/money`.
- Data/API/sync: no changes (existing `useTransaction`, `useUpdateTransaction`,
  `useDeleteTransaction` hooks and repository/sync paths are consumed as-is).
- Tests: unit/component tests for the form, helpers, and row wiring; a
  Maestro flow for the new edit/delete user flow.
